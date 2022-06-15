import { isEmpty } from "@re-/tools"
import { Root } from "./nodes/index.js"
import { Common } from "#common"

/**
 * Create a model.
 * @param definition {@as string} Document this.
 * @param options {@as ModelConfig?} And that.
 * @returns {@as any} The result.
 */
export const model: ModelFunction = (definition, options = {}) => {
    const root = Root.parse(definition, Common.createRootParseContext(options))
    return new Model(root, options) as any
}

export const eager: ModelFunction = (definition, options = {}) => {
    options.parse = { eager: true }
    return model(definition, options)
}

export type Options = {
    parse?: ParseOptions
    validate?: ValidateOptions
    generate?: GenerateOptions
}

export class Model implements AnyModel {
    definition: unknown

    constructor(public root: Common.Node, public config: Common.Options = {}) {
        this.definition = root.def
    }

    get type() {
        return Common.chainableNoOp
    }

    validate(value: unknown, options?: Common.ValidateOptions) {
        const errorsByPath = this.validateByPath(value, options)
        return isEmpty(errorsByPath)
            ? { data: value }
            : { error: Common.stringifyErrors(errorsByPath), errorsByPath }
    }

    assert(value: unknown, options?: Common.ValidateOptions) {
        const { error } = this.validate(value, options)
        if (error) {
            throw new Common.ValidationError(error)
        }
    }

    generate(options?: Common.GenerateOptions) {
        return this.root.generate({
            ctx: Common.createRootMethodContext({
                ...this.config.generate,
                ...options
            })
        })
    }

    validateByPath(value: unknown, options?: Common.ValidateOptions) {
        const args: Common.AllowsArgs = {
            value,
            errors: {},
            ctx: Common.createRootMethodContext({
                ...this.config.validate,
                ...options
            })
        }
        this.root.allows(args)
        if (this.config.validate?.validator) {
            return Common.getErrorsFromCustomValidator(
                this.config.validate.validator,
                { ...args, def: this.definition }
            )
        }
        return args.errors
    }
}

/*
 * Just use unknown for now since we don't have all the definitions yet
 * but we still want to allow references to other declared types
 */
export type CheckReferences<
    Def,
    DeclaredTypeName extends string
> = Root.Validate<
    Def,
    {
        [TypeName in DeclaredTypeName]: "unknown"
    }
>

export type AssertOptions = Common.ValidateOptions

export type ValidateFunction<ModeledType> = (
    value: unknown,
    options?: Common.ValidateOptions
) => {
    data?: ModeledType
    error?: string
    errorsByPath?: Common.ErrorsByPath
}

export type AssertFunction<ModeledType> = (
    value: unknown,
    options?: Common.ValidateOptions
) => asserts value is ModeledType

export type GenerateFunction<ModeledType> = (
    options?: Common.GenerateOptions
) => ModeledType

export type ModelFunction<Dict = {}> = <Def>(
    definition: Root.Validate<Def, Dict>,
    options?: Common.Options
) => ModelFrom<Def, Parse<Def, Dict>>

export type ModelFrom<Def, ModeledType> = {
    definition: Def
    type: ModeledType
    validate: ValidateFunction<ModeledType>
    assert: AssertFunction<ModeledType>
    generate: GenerateFunction<ModeledType>
}

export type Parse<Def, Dict> = Root.Parse<Def, Dict, {}>

type AnyModel = ModelFrom<any, any>
