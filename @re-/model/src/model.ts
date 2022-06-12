import { isEmpty } from "@re-/tools"
import { Root } from "./nodes/index.js"
import { Space } from "./space.js"
import { Common } from "#common"

/**
 * Create a model.
 * @param definition {@as string} Document this.
 * @param options {@as ModelConfig?} And that.
 * @returns {@as any} The result.
 */
export const model: ModelFunction = (definition, options) =>
    new Model(definition, options) as any

export const eager: ModelFunction = (definition, options = {}) => {
    options.parse = { eager: true }
    return new Model(definition, options) as any
}

export class Model implements AnyModel {
    root: Common.Node<unknown>
    config: Common.BaseOptions

    constructor(
        public readonly definition: AnyModel["definition"],
        options?: Common.BaseOptions,
        space?: Space
    ) {
        this.config = options ?? {}
        this.root = Root.parse(definition, {
            ...Common.defaultParseContext,
            config: this.config,
            space
        })
    }

    get type() {
        return Common.typeDefProxy
    }

    validate(value: unknown, options?: Common.ValidateOptions) {
        const errorsByPath = this.root.validateByPath(value, {
            ...this.config.validate,
            ...options
        })
        return isEmpty(errorsByPath)
            ? { data: value }
            : { error: Common.stringifyErrors(errorsByPath), errorsByPath }
    }

    assert(value: unknown) {
        const { error } = this.validate(value)
        if (error) {
            throw new Error(error)
        }
    }

    generate() {
        return this.root.generate()
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
    options?: Common.GenerateConfig
) => ModeledType

export type ModelFunction<Dict = {}> = <Def>(
    definition: Root.Validate<Def, Dict>,
    options?: Common.BaseOptions
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
