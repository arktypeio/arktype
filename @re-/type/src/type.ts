import {
    chainableNoOpProxy,
    ElementOf,
    Evaluate,
    IterateType,
    Merge,
    MutuallyExclusiveProps
} from "@re-/tools"
import { Node } from "./common.js"
import { Root } from "./root.js"
import type { SpaceMeta } from "./space.js"

export const type: TypeFunction = (
    definition,
    options = {},
    space?: SpaceMeta
) => {
    const root = Root.parse(definition, Node.initializeContext(options, space))
    return new Type(definition, root, options) as any
}

export type TypeOptions = {
    validate?: Node.Allows.Options
    create?: Node.Create.Options
}

export type TypeFunction<Dict = {}, Meta = {}> = <Def>(
    definition: Root.Validate<Def, Dict>,
    options?: TypeOptions
) => TypeFrom<
    Def,
    Root.Parse<Def, Dict>,
    InferTree<
        Root.Parse<Def, Dict>,
        // @ts-expect-error
        Node.InferenceContext.Initialize<Dict, Meta>
    >
>

export type TypeFrom<Def, Tree, Inferred> = Evaluate<{
    definition: Def
    infer: Inferred
    validate: ValidateFunction<Inferred>
    assert: AssertFunction<Inferred>
    default: Inferred
    tree: Tree
    create: CreateFunction<Inferred>
    references: ReferencesFunction<Tree>
}>

export class Type implements TypeFrom<unknown, unknown, unknown> {
    constructor(
        public definition: unknown,
        public root: Node.Base,
        public config: TypeOptions = {}
    ) {}

    get infer() {
        return chainableNoOpProxy
    }

    get default() {
        return this.create()
    }

    get tree() {
        return {}
    }

    validate(value: unknown, options?: Node.Allows.Options) {
        const args = Node.Allows.createArgs(
            value,
            options,
            this.config.validate
        )
        const customValidator =
            args.cfg.validator ?? args.ctx.modelCfg.validator ?? "default"
        if (customValidator !== "default") {
            Node.Allows.customValidatorAllows(customValidator, this.root, args)
        } else {
            this.root.allows(args)
        }
        return args.errors.isEmpty()
            ? { data: value }
            : {
                  error: new Node.Allows.ValidationError(args.errors)
              }
    }

    assert(value: unknown, options?: Node.Allows.Options) {
        const validationResult = this.validate(value, options)
        if (validationResult.error) {
            throw validationResult.error
        }
        return validationResult.data
    }

    create(options?: Node.Create.Options) {
        return this.root.create(
            Node.Create.createArgs(options, this.config.create)
        )
    }

    references(options: Node.References.Options = {}) {
        return this.root.references(options) as any
    }
}

export type AssertOptions = Node.Allows.Options

export type ValidateFunction<TypeedType> = (
    value: unknown,
    options?: Node.Allows.Options
) => ValidationResult<TypeedType>

export type ValidationResult<TypeedType> = MutuallyExclusiveProps<
    { data: TypeedType },
    {
        error: Node.Allows.ValidationError
    }
>

export type AssertFunction<InferredType> = (
    value: unknown,
    options?: Node.Allows.Options
) => InferredType

export type CreateFunction<InferredType> = (
    options?: Node.Create.Options
) => InferredType

export type ReferencesFunction<Tree> = <
    Options extends Node.References.Options = {}
>(
    options?: Options
) => Merge<
    {
        filter: Node.References.FilterFunction<string>
        preserveStructure: false
    },
    Options
> extends Node.References.Options<infer Filter, infer PreserveStructure>
    ? TransformReferences<
          Root.References<Tree, PreserveStructure>,
          Filter,
          "list"
      >
    : []

// TODO: Check how many types actually checking extends here contributes
export type Infer<Def, Dict = {}, Meta = {}> = InferTree<
    Root.Parse<Def, Dict>,
    // @ts-expect-error
    Node.InferenceContext.Initialize<Dict, Meta>
>

export type InferTree<Tree, Ctx extends Node.InferenceContext> = Root.Infer<
    Tree,
    Ctx
>

export type Validate<Def, Dict = {}> = Root.Validate<Def, Dict>

export type References<
    Def,
    Dict = {},
    Options extends Node.References.TypeOptions = {}
> = ReferencesOfTree<Root.Parse<Def, Dict>, Options>

export type ReferencesOfTree<
    Tree,
    Options extends Node.References.TypeOptions
> = Merge<
    { filter: string; preserveStructure: false; format: "list" },
    Options
> extends Node.References.TypeOptions<
    infer Filter,
    infer PreserveStructure,
    infer Format
>
    ? TransformReferences<
          Root.References<Tree, PreserveStructure>,
          Filter,
          Format
      >
    : {}

type TransformReferences<
    References,
    Filter extends string,
    Format extends Node.References.TypeFormat
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
    Format extends Node.References.TypeFormat
> = Format extends "tuple"
    ? References
    : Format extends "list"
    ? ElementOf<References>[]
    : ElementOf<References>
