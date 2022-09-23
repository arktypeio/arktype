import type {
    ElementOf,
    Evaluate,
    IterateType,
    Merge,
    MutuallyExclusiveProps
} from "@re-/tools"
import { chainableNoOpProxy } from "@re-/tools"
import { Allows } from "./nodes/allows.js"
import type { Base } from "./nodes/base.js"
import { Generate } from "./nodes/generate.js"
import type { References } from "./nodes/references.js"
import type { RootInfer, RootReferences } from "./nodes/root.js"
import type { ParseOptions } from "./parser/common.js"
import { initializeParseContext } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { Space, SpaceMeta } from "./space.js"

export const type: TypeFunction = (
    definition,
    options = {},
    space?: SpaceMeta
) => {
    const root = Root.parse(definition, initializeParseContext(options, space))
    return new Type(definition, root, options) as any
}

export const dynamic = type as DynamicTypeFunction

export type DynamicTypeFunction = (
    definition: unknown,
    options?: TypeOptions
) => DynamicType

export type DynamicType = TypeFrom<unknown, {}, unknown>

export type TypeOptions = {
    parse?: ParseOptions
    validate?: Allows.Options
    generate?: Generate.Options
}

export type TypeFunction<S extends Space = { Dict: {}; Meta: {} }> = <Def>(
    definition: Root.Validate<Def, S["Dict"]>,
    options?: TypeOptions
) => TypeFrom<Def, S["Dict"], Infer<Def, Base.InferenceContext.FromSpace<S>>>

export type TypeFrom<Def, Dict, Inferred> = Evaluate<{
    definition: Def
    infer: Inferred
    check: ValidateFunction<Inferred>
    assert: AssertFunction<Inferred>
    default: Inferred
    ast: Root.Parse<Def, Dict>
    create: CreateFunction<Inferred>
    references: ReferencesFunction<Def, Dict>
}>

export class Type implements DynamicType {
    constructor(
        public definition: unknown,
        public root: Base.node,
        public config: TypeOptions = {}
    ) {}

    get infer() {
        return chainableNoOpProxy
    }

    get default() {
        return this.create()
    }

    get ast() {
        return this.root.ast as any
    }

    check(value: unknown, options?: Allows.Options) {
        const args = Allows.createArgs(value, options, this.config.validate)
        const customValidator =
            args.cfg.validator ?? args.context.modelCfg.validator ?? "default"
        if (customValidator !== "default") {
            Allows.checkCustomValidator(customValidator, this.root, args)
        } else {
            this.root.check(args)
        }
        return args.diagnostics.length
            ? {
                  errors: new Allows.Diagnostics(...args.diagnostics)
              }
            : { data: value }
    }

    assert(value: unknown, options?: Allows.Options) {
        const validationResult = this.check(value, options)
        if (validationResult.errors) {
            throw new Allows.ValidationError(validationResult.errors.summary)
        }
        return validationResult.data
    }

    create(options?: Generate.Options) {
        return this.root.generate(
            Generate.createArgs(options, this.config.generate)
        )
    }

    references(options: References.Options = {}) {
        return this.root.references(options) as any
    }
}

export type ValidateFunction<Inferred> = (
    value: unknown,
    options?: Allows.Options
) => ValidationResult<Inferred>

export type ValidationResult<Inferred> = MutuallyExclusiveProps<
    { data: Inferred },
    {
        errors: Allows.Diagnostics
    }
>

export type AssertFunction<Inferred> = (
    value: unknown,
    options?: Allows.Options
) => Inferred

export type CreateFunction<Inferred> = (options?: Generate.Options) => Inferred

export type ReferencesFunction<Def, Dict> = <
    Options extends References.Options = {}
>(
    options?: Options
) => Merge<
    {
        filter: References.FilterFunction<string>
        preserveStructure: false
    },
    Options
> extends References.Options<infer Filter, infer PreserveStructure>
    ? TransformReferences<
          RootReferences<Def, Dict, PreserveStructure>,
          Filter,
          "list"
      >
    : []

export type Infer<Def, S extends Space> = RootInfer<
    Def,
    Base.InferenceContext.From<{
        Dict: S["Dict"]
        Meta: S["Meta"]
        Seen: {}
    }>
>

export type Validate<Def, Dict = {}> = Root.Validate<Def, Dict>

export type ReferencesOf<
    Def,
    Dict,
    Options extends References.TypeOptions = {}
> = Merge<
    { filter: string; preserveStructure: false; format: "list" },
    Options
> extends References.TypeOptions<
    infer Filter,
    infer PreserveStructure,
    infer Format
>
    ? TransformReferences<
          RootReferences<Def, Dict, PreserveStructure>,
          Filter,
          Format
      >
    : {}

type TransformReferences<
    References,
    Filter extends string,
    Format extends References.TypeFormat
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
> = References extends IterateType<string, infer Current, infer Remaining>
    ? FilterReferenceList<
          Remaining,
          Filter,
          Current extends Filter ? [...Result, Current] : Result
      >
    : Result

type FormatReferenceList<
    References extends string[],
    Format extends References.TypeFormat
> = Format extends "tuple"
    ? References
    : Format extends "list"
    ? ElementOf<References>[]
    : ElementOf<References>
