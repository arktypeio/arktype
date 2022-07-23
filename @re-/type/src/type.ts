import {
    chainableNoOpProxy,
    ElementOf,
    Evaluate,
    Iteration,
    Merge,
    MutuallyExclusiveProps
} from "@re-/tools"
import { Base, Root } from "./nodes/index.js"

/**
 * Create a model.
 * @param definition {@as string} Document this.
 * @param options {@as TypeConfig?} And that.
 * @returns {@as any} The result.
 */
export const type: TypeFunction = (definition, options) => {
    const root = Root.parse(definition, Base.Parsing.createContext(options))
    return new Type(root, options) as any
}

export const eager: TypeFunction = (definition, options = {}) => {
    options.parse = { eager: true }
    return type(definition, options) as any
}

export type TypeFunction<Dict = {}, Meta = {}> = <Def>(
    definition: Root.Validate<Def, Dict>,
    options?: Base.TypeOptions
) => TypeFrom<Def, Dict, TypeOf<Def, Dict, Meta>>

export type TypeFrom<Def, Dict, TypeOf> = Evaluate<{
    definition: Def
    infer: TypeOf
    validate: ValidateFunction<TypeOf>
    assert: AssertFunction<TypeOf>
    default: TypeOf
    create: CreateFunction<TypeOf>
    references: ReferencesFunction<Def, Dict>
}>
export class Type implements TypeFrom<unknown, unknown, unknown> {
    definition: unknown

    constructor(
        public root: Base.Parsing.Node,
        public config: Base.TypeOptions = {}
    ) {
        this.definition = root.def
    }

    get infer() {
        return chainableNoOpProxy
    }

    get default() {
        return this.create()
    }

    validate(value: unknown, options?: Base.Validation.Options) {
        const args = Base.Validation.createArgs(
            value,
            options,
            this.config.validate
        )
        const customValidator =
            args.cfg.validator ?? args.ctx.modelCfg.validator ?? "default"
        if (customValidator !== "default") {
            Base.Validation.customValidatorAllows(
                customValidator,
                this.root,
                args
            )
        } else {
            this.root.allows(args)
        }
        return args.errors.isEmpty()
            ? { data: value }
            : {
                  error: new Base.Validation.ValidationError(args.errors)
              }
    }

    assert(value: unknown, options?: Base.Validation.Options) {
        const validationResult = this.validate(value, options)
        if (validationResult.error) {
            throw validationResult.error
        }
        return validationResult.data
    }

    create(options?: Base.Create.Options) {
        return this.root.generate(
            Base.Create.createArgs(options, this.config.generate)
        )
    }

    references(options: Base.References.Options = {}) {
        if (options.preserveStructure) {
            return this.root.structureReferences(options) as any
        }
        const collected = new Set<string>()
        this.root.collectReferences(options, collected)
        return [...collected]
    }
}

export type AssertOptions = Base.Validation.Options

export type ValidateFunction<TypeedType> = (
    value: unknown,
    options?: Base.Validation.Options
) => ValidationResult<TypeedType>

export type ValidationResult<TypeedType> = MutuallyExclusiveProps<
    { data: TypeedType },
    {
        error: Base.Validation.ValidationError
    }
>

export type AssertFunction<TypeedType> = (
    value: unknown,
    options?: Base.Validation.Options
) => TypeedType

export type CreateFunction<TypeedType> = (
    options?: Base.Create.Options
) => TypeedType

export type ReferencesFunction<Def, Dict> = <
    Options extends Base.References.Options = {}
>(
    options?: Options
) => Merge<
    {
        filter: Base.References.FilterFunction<string>
        preserveStructure: false
    },
    Options
> extends Base.References.Options<infer Filter, infer PreserveStructure>
    ? TransformReferences<
          Root.References<Def, Dict, PreserveStructure>,
          Filter,
          "list"
      >
    : []

export type TypeOf<Def, Dict = {}, Meta = {}> = Root.TypeOf<
    Def,
    // @ts-expect-error
    { dict: Dict; meta: Meta; seen: {} }
>

export type Validate<Def, Dict = {}> = Root.Validate<Def, Dict>

export type References<
    Def,
    Dict,
    Options extends Base.References.TypeOptions = {}
> = Merge<
    { filter: string; preserveStructure: false; format: "list" },
    Options
> extends Base.References.TypeOptions<
    infer Filter,
    infer PreserveStructure,
    infer Format
>
    ? TransformReferences<
          Root.References<Def, Dict, PreserveStructure>,
          Filter,
          Format
      >
    : {}

type TransformReferences<
    References,
    Filter extends string,
    Format extends Base.References.TypeFormat
> = References extends string[]
    ? FormatReferenceList<FilterReferenceList<References, Filter, []>, Format>
    : {
          [K in keyof References]: TransformReferences<
              References[K],
              Filter,
              Format
          >
      }

type FilterReferenceList<
    References extends string[],
    Filter extends string,
    Result extends string[]
> = References extends Iteration<string, infer Current, infer Remaining>
    ? FilterReferenceList<
          Remaining,
          Filter,
          Current extends Filter ? [...Result, Current] : Result
      >
    : Result

type FormatReferenceList<
    References extends string[],
    Format extends Base.References.TypeFormat
> = Format extends "tuple"
    ? References
    : Format extends "list"
    ? ElementOf<References>[]
    : ElementOf<References>
