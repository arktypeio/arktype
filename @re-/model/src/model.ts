import { Evaluate, isEmpty, KeyValuate } from "@re-/tools"
import {
    duplicateSpaceError,
    stringifyErrors,
    ValidationErrors
} from "./errors.js"
import { errorsFromCustomValidator, typeDefProxy } from "./internal.js"
import { defaultParseContext, ParseContext } from "./nodes/base.js"
import { Root } from "./nodes/index.js"
import { ConfiguredSpace, SpaceConfig, SpaceDefinition } from "./space.js"

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

export interface BaseOptions {
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
    errors: ValidationErrors,
    ctx: ParseContext
) => string | ValidationErrors

export type AssertOptions = ValidateConfig

export type ValidateFunction = <Options extends ValidateConfig>(
    value: unknown,
    options?: Options
) => {
    error?: string
    errorsByPath?: ValidationErrors
}

const createRootValidate =
    (
        validate: any,
        definition: unknown,
        customValidator: CustomValidator | undefined
    ): ValidateFunction =>
    (value, options) => {
        let errorsByPath = validate(value, options)
        if (customValidator) {
            errorsByPath = errorsFromCustomValidator(customValidator, [
                value,
                errorsByPath,
                // @ts-ignore
                { def: definition, ctx: defaultParseContext }
            ])
        }
        return isEmpty(errorsByPath)
            ? {}
            : {
                  error: stringifyErrors(errorsByPath),
                  errorsByPath: errorsByPath
              }
    }

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

export const createCreateFunction =
    (predefinedSpace?: SpaceDefinition): CreateFunction<any> =>
    // @ts-ignore
    (definition, config) => {
        if (predefinedSpace && config?.space) {
            throw new Error(duplicateSpaceError)
        }
        const space = configureSpace(
            config?.space ??
                predefinedSpace ?? {
                    dictionary: {}
                }
        )
        const context: ParseContext = {
            ...defaultParseContext,
            config: {
                ...config,
                space
            }
        }
        const {
            validate: internalValidate,
            references,
            generate
        } = Root.Node.parse(definition, context) as any
        const validate = createRootValidate(
            internalValidate,
            definition,
            config?.validate?.validator
        )
        return {
            type: typeDefProxy,
            space,
            definition,
            validate,
            references,
            generate,
            assert: (value: unknown, options?: AssertOptions) => {
                const { error } = validate(value, options)
                if (error) {
                    throw new Error(error)
                }
            }
        }
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

export type CreateFunction<PredefinedDict> = <
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
export const model: CreateFunction<{}> = createCreateFunction()
