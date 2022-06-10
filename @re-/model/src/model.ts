import { Evaluate, KeyValuate } from "@re-/tools"
import { Root } from "./nodes/index.js"
import { ConfiguredSpace, SpaceConfig, SpaceDefinition } from "./space.js"
import { Common } from "#common"

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

export type ReferencesConfig = {}

export type GenerateConfig = {
    /*
     * By default, generate will throw if it encounters a cyclic required type
     * If this options is provided, it will return its value instead
     */
    onRequiredCycle?: any
}

export interface ParseConfig {
    eager?: boolean
}

export interface BaseOptions {
    parse?: ParseConfig
    validate?: ValidateConfig
    generate?: GenerateConfig
    references?: ReferencesConfig
}

export interface ModelOptions extends BaseOptions {
    space?: SpaceDefinition
}

export interface ModelConfig extends BaseOptions {
    space: ConfiguredSpace
}

export type ValidateConfig = {
    ignoreExtraneousKeys?: boolean
    validator?: CustomValidator
    verbose?: boolean
}

export type CustomValidator = (
    value: unknown,
    errors: Common.ErrorsByPath,
    ctx: Common.ParseContext
) => string | Common.ErrorsByPath

export type AssertOptions = ValidateConfig

export type ValidateFunction = <Options extends ValidateConfig>(
    value: unknown,
    options?: Options
) => {
    error?: string
    errorsByPath?: Common.ErrorsByPath
}

export const errorsFromCustomValidator = (
    customValidator: CustomValidator,
    args: Parameters<CustomValidator>
): Common.ErrorsByPath => {
    const result = customValidator(...args)
    if (result && typeof result === "string") {
        // @ts-ignore
        return validationError({ path: args[2].ctx.path, message: result })
    } else if (result) {
        return result as Common.ErrorsByPath
    }
    return {}
}

// const createRootValidate =
//     (
//         validate: any,
//         definition: unknown,
//         customValidator: CustomValidator | undefined
//     ): ValidateFunction =>
//     (value, options) => {
//         let errorsByPath = validate(value, options)
//         if (customValidator) {
//             errorsByPath = errorsFromCustomValidator(customValidator, [
//                 value,
//                 errorsByPath,
//                 // @ts-ignore
//                 { def: definition, ctx: defaultParseContext }
//             ])
//         }
//         return isEmpty(errorsByPath)
//             ? {}
//             : {
//                   error: Base.stringifyErrors(errorsByPath),
//                   errorsByPath: errorsByPath
//               }
//     }

// Move meta keys like onCycle and onResolve to config, since they are not valid types
const configureSpace = (definition: SpaceDefinition): ConfiguredSpace => {
    const { onCycle, onResolve, ...dictionary } = definition.dictionary
    const config: SpaceConfig<string> = definition.config ?? {}
    if (onCycle) {
        config.onCycle = onCycle
    }
    if (onResolve) {
        config.onResolve = onResolve
    }
    return {
        dictionary,
        config
    }
}

export const createModelFunction =
    (predefinedSpace?: SpaceDefinition): ModelFunction<any> =>
    // @ts-ignore
    (definition, config) => {
        if (predefinedSpace && config?.space) {
            throw new Error(
                "Space has already been determined according to the source of this 'model' method."
            )
        }
        const space = configureSpace(
            config?.space ??
                predefinedSpace ?? {
                    dictionary: {}
                }
        )
        const context: Common.ParseContext = {
            ...Common.defaultParseContext,
            ...predefinedSpace?.config?.parse,
            config: {
                ...config,
                space
            }
        }
        return Root.parse(definition, context)
    }

export type Model<Def, ModelType> = Evaluate<{
    definition: Def
    type: ModelType
    config: ModelOptions
    validate: ValidateFunction
    assert: (value: unknown, options?: AssertOptions) => void
    generate: (options?: GenerateConfig) => ModelType
    references: (options?: ReferencesConfig) => any
}>

export type ModelFunction<PredefinedDict> = <
    Def,
    Options extends ModelOptions,
    ActiveDict = KeyValuate<Options["space"], "dictionary", PredefinedDict>
>(
    definition: Root.Validate<Def, ActiveDict>,
    options?: Options
) => Model<Def, Root.Parse<Def, ActiveDict, {}>>

/**
 * Create a model.
 * @param definition {@as string} Document this.
 * @param options {@as ModelConfig?} And that.
 * @returns {@as any} The result.
 */
export const model: ModelFunction<{}> = createModelFunction()

export const eager: ModelFunction<{}> = createModelFunction({
    config: { parse: { eager: true } },
    dictionary: {}
})
