import { Evaluate, isEmpty, KeyValuate, narrow } from "@re-/tools"
import { Root } from "./definitions/index.js"
import {
    ParseContext,
    defaultParseContext,
    InheritableMethodContext
} from "./definitions/parser.js"
import {
    duplicateSpaceError,
    stringifyErrors,
    ValidationErrors
} from "./errors.js"
import {
    errorsFromCustomValidator,
    Merge,
    typeDefProxy,
    Unset
} from "./internal.js"
import { ConfiguredSpace, SpaceConfig, SpaceDefinition } from "./space.js"

export type FastParse<
    Def,
    Dict,
    Options = {},
    OptionsWithDefaults = Merge<DefaultParseOptions, Options>,
    Checked = Dict
> = Root.FastParse<
    Def,
    Checked,
    OptionsWithDefaults & {
        seen: {}
    }
>

export type ReferencesTypeOptions = {
    asTuple?: boolean
    asList?: boolean
    filter?: string
}

export type ParseConfig = {
    onCycle?: any
    deepOnCycle?: boolean
    onResolve?: any
}

export type DefaultParseOptions = {
    onCycle: Unset
    deepOnCycle: false
    onResolve: Unset
}

// Just use unknown for now since we don't have all the definitions yet
// but we still want to allow references to other declared types
export type CheckReferences<
    Def,
    DeclaredTypeName extends string
> = Root.FastValidate<
    Def,
    {
        [TypeName in DeclaredTypeName]: "unknown"
    }
>

export type ReferencesConfig = {}

export type GenerateConfig = {
    // By default, generate will throw if it encounters a cyclic required type
    // If this options is provided, it will return its value instead
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
    ctx: Omit<InheritableMethodContext<any, any>, "components">
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
        validate: ReturnType<typeof Root.parser.parse>["validate"],
        definition: any,
        customValidator: CustomValidator | undefined
    ): ValidateFunction =>
    (value, options) => {
        let errorsByPath = validate(value, options)
        if (customValidator) {
            errorsByPath = errorsFromCustomValidator(customValidator, [
                value,
                errorsByPath,
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
        } = Root.parser.parse(definition, context)
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
    definition: Root.FastValidate<Def, ActiveDict>,
    options?: Options
) => Model<Def, FastParse<Def, ActiveDict>>

/**
 * Create a model.
 * @param definition {@as string} Document this.
 * @param options {@as ModelConfig?} And that.
 * @returns {@as any} The result.
 */
export const model: CreateFunction<{}> = createCreateFunction()

const user = model(
    {
        name: {
            first: "string",
            middle: "string?",
            last: "string"
        },
        age: "number",
        browser: "'chrome'|'firefox'|'other'|null",
        ok: "a"
    },
    { space: { dictionary: narrow({ a: { a: "'ok'" } }) } }
)
