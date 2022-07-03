import {
    chainableNoOpProxy,
    Evaluate,
    MutuallyExclusiveProps
} from "@re-/tools"
import { Base, Root } from "./nodes/index.js"

/**
 * Create a model.
 * @param definition {@as string} Document this.
 * @param options {@as ModelConfig?} And that.
 * @returns {@as any} The result.
 */
export const model: ModelFunction = (definition, options) => {
    const root = Root.parse(definition, Base.Parsing.createContext(options))
    return new Model(root, options) as any
}

export const eager: ModelFunction = (definition, options = {}) => {
    options.parse = { eager: true }
    return model(definition, options) as any
}

export type ModelFunction<Dict = {}> = <Def>(
    definition: Root.Validate<Def, Dict>,
    options?: Base.ModelOptions
) => ModelFrom<Def, Parse<Root.Validate<Def, Dict>, Dict>>

export type ModelFrom<Def, ModeledType> = Evaluate<{
    definition: Def
    type: ModeledType
    validate: ValidateFunction<ModeledType>
    assert: AssertFunction<ModeledType>
    generate: GenerateFunction<ModeledType>
    references: ReferencesFunction<Def>
}>

export class Model implements ModelFrom<unknown, unknown> {
    definition: unknown

    constructor(
        public root: Base.Parsing.Node,
        public config: Base.ModelOptions = {}
    ) {
        this.definition = root.def
    }

    get type() {
        return chainableNoOpProxy
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

    generate(options?: Base.Generation.Options) {
        return this.root.generate(
            Base.Generation.createArgs(options, this.config.generate)
        )
    }

    references(options?: Base.References.Options) {
        return this.root.references(options ?? {}) as any
    }
}

export type AssertOptions = Base.Validation.Options

export type ValidateFunction<ModeledType> = (
    value: unknown,
    options?: Base.Validation.Options
) => ValidationResult<ModeledType>

export type ValidationResult<ModeledType> = MutuallyExclusiveProps<
    { data: ModeledType },
    {
        error: Base.Validation.ValidationError
    }
>

export type AssertFunction<ModeledType> = (
    value: unknown,
    options?: Base.Validation.Options
) => ModeledType

export type GenerateFunction<ModeledType> = (
    options?: Base.Generation.Options
) => ModeledType

export type ReferencesFunction<Def> = <Options extends Base.References.Options>(
    options?: Options
) => Options extends Base.References.Options<
    infer Filter,
    infer PreserveStructure
>
    ? References<Def, Filter, PreserveStructure>
    : []

export type Parse<Def, Dict> = Root.Parse<Def, Dict, {}>

export type References<
    Def,
    Filter = unknown,
    PreserveStructure extends boolean = false,
    Format extends Base.References.TypeFormat = "list"
> = Root.References<Def, Filter, PreserveStructure, Format>
