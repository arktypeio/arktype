import {
    chainableNoOpProxy,
    Evaluate,
    MutuallyExclusiveProps
} from "@re-/tools"
import { Common } from "./nodes/common.js"
import { ModelOptions } from "./nodes/common/utils.js"
import { Root } from "./nodes/index.js"

/**
 * Create a model.
 * @param definition {@as string} Document this.
 * @param options {@as ModelConfig?} And that.
 * @returns {@as any} The result.
 */
export const model: ModelFunction = (definition, options) => {
    const root = Root.parse(definition, Common.Parser.createContext(options))
    return new Model(root, options) as any
}

export const eager: ModelFunction = (definition, options = {}) => {
    options.parse = { eager: true }
    return model(definition, options)
}

export type ModelFunction<Dict = {}> = <Def>(
    definition: Root.Validate<Def, Dict>,
    options?: ModelOptions
) => ModelFrom<Def, Parse<Root.Validate<Def, Dict>, Dict>>

export type ModelFrom<Def, ModeledType> = Evaluate<{
    definition: Def
    type: ModeledType
    validate: ValidateFunction<ModeledType>
    assert: AssertFunction<ModeledType>
    generate: GenerateFunction<ModeledType>
}>

export class Model implements ModelFrom<any, any> {
    definition: unknown

    constructor(
        public root: Common.Parser.Node,
        public config: ModelOptions = {}
    ) {
        this.definition = root.def
    }

    get type() {
        return chainableNoOpProxy
    }

    validate(value: unknown, options?: Common.Allows.Options) {
        const args = Common.Allows.createArgs(
            value,
            options,
            this.config.validate
        )
        const customValidator =
            args.cfg.validator ?? args.ctx.modelCfg.validator ?? "default"
        if (customValidator !== "default") {
            Common.Allows.customValidatorAllows(
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
                  error: new Common.Allows.ValidationError(args.errors)
              }
    }

    assert(value: unknown, options?: Common.Allows.Options) {
        const validationResult = this.validate(value, options)
        if (validationResult.error) {
            throw validationResult.error
        }
        return validationResult.data
    }

    generate(options?: Common.Generate.Options) {
        return this.root.generate(
            Common.Generate.createArgs(options, this.config.generate)
        )
    }
}

export type AssertOptions = Common.Allows.Options

export type ValidateFunction<ModeledType> = (
    value: unknown,
    options?: Common.Allows.Options
) => ValidationResult<ModeledType>

export type ValidationResult<ModeledType> = MutuallyExclusiveProps<
    { data: ModeledType },
    {
        error: Common.Allows.ValidationError
    }
>

export type AssertFunction<ModeledType> = (
    value: unknown,
    options?: Common.Allows.Options
) => ModeledType

export type GenerateFunction<ModeledType> = (
    options?: Common.Generate.Options
) => ModeledType

export type Parse<Def, Dict> = Root.Parse<Def, Dict, {}>

export type References<Def, Filter = unknown> = Root.References<Def, Filter>
