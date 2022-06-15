import { isEmpty } from "@re-/tools"
import { Allows } from "./nodes/common/common.js"
import { Root } from "./nodes/index.js"
import { Common } from "#common"

/**
 * Create a model.
 * @param definition {@as string} Document this.
 * @param options {@as ModelConfig?} And that.
 * @returns {@as any} The result.
 */
export const model: ModelFunction = (definition, options = {}) => {
    const root = Root.parse(definition, Common.Parser.createContext())
    return new Model(root, options) as any
}

export const eager: ModelFunction = (definition, options = {}) => {
    options.parse = { eager: true }
    return model(definition, options)
}

export type Options = {
    parse?: Common.Parser.Options
    validate?: Common.Allows.Options
    generate?: Common.Generate.Options
}

export class Model implements AnyModel {
    definition: unknown

    constructor(public root: Common.Parser.Node, public config: Options = {}) {
        this.definition = root.def
    }

    get type() {
        return Common.chainableNoOpProxy
    }

    validate(value: unknown, options?: Common.Allows.Options) {
        const args = Common.Allows.createArgs(value, options)
        this.root.allows(args)
        return args.errors.isEmpty()
            ? { data: value }
            : { error: args.errors.toString(), errorsByPath: args.errors.all() }
    }

    assert(value: unknown, options?: Common.Allows.Options) {
        const { error } = this.validate(value, options)
        if (error) {
            throw new Common.Allows.ValidationError(error)
        }
    }

    generate(options?: Common.Generate.Options) {
        return this.root.generate({
            ctx: Common.Traverse.createContext(),
            cfg: options ?? {}
        })
    }

    validateByPath(value: unknown, options?: Common.Allows.Options) {
        const args = Common.Allows.createArgs(value, options)
        this.root.allows(args)
        if (this.config.validate?.validator) {
            // return Common.Allows.getErrorsFromCustomValidator(
            //     this.config.validate.validator,
            //     { ...args, def: this.definition }
            // )
        }
        return args.errors.all()
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

export type AssertOptions = Common.Allows.Options

export type ValidateFunction<ModeledType> = (
    value: unknown,
    options?: Common.Allows.Options
) => {
    data?: ModeledType
    error?: string
    errorsByPath?: Common.Allows.ErrorsByPath
}

export type AssertFunction<ModeledType> = (
    value: unknown,
    options?: Common.Allows.Options
) => asserts value is ModeledType

export type GenerateFunction<ModeledType> = (
    options?: Common.Generate.Options
) => ModeledType

export type ModelFunction<Dict = {}> = <Def>(
    definition: Root.Validate<Def, Dict>,
    options?: Options
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
