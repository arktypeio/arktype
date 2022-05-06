import { Evaluate, Narrow, isEmpty, KeyValuate, Get, narrow } from "@re-/tools"
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
    MergeAll,
    Unset
} from "./internal.js"
import { SpaceDefinition } from "./space.js"

export type FastParse<
    Def,
    Dict,
    Options = {},
    OptionsWithDefaults = Merge<DefaultParseOptions, Options>,
    Checked = Dict //ValidateSpaceDict<Dict>
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

export interface ModelConfig {
    validate?: ValidateConfig
    generate?: GenerateConfig
    references?: ReferencesConfig
    space?: SpaceDefinition
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

export type CreateCreateFunction = <PredefinedSpace>(
    predefinedSpace: Narrow<PredefinedSpace>
) => CreateFunction<PredefinedSpace>

export const createCreateFunction: CreateCreateFunction =
    (predefinedSpace) => (definition, config) => {
        if (predefinedSpace && config?.space) {
            throw new Error(duplicateSpaceError)
        }
        const space: any = predefinedSpace ??
            config?.space ?? { dictionary: {} }
        const context: ParseContext = {
            ...defaultParseContext,
            // @ts-ignore
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
        } as any
    }

export type Model<Def, ModelType> = Evaluate<{
    definition: Def
    type: ModelType
    config: ModelConfig
    validate: ValidateFunction
    assert: (value: unknown, options?: AssertOptions) => void
    generate: (options?: GenerateConfig) => ModelType
    references: (options?: ReferencesConfig) => any
}>

export type CreateFunction<PredefinedDict> = <
    Def,
    Options extends ModelConfig,
    ActiveDict = KeyValuate<Options["space"], "dictionary", PredefinedDict>
>(
    definition: Root.FastValidate<Def, ActiveDict>,
    options?: Options
) => Model<Def, FastParse<Def, ActiveDict>> & { dict: ActiveDict }

/**
 * Create a model.
 * @param definition {@as string} Document this.
 * @param options {@as ModelConfig?} And that.
 * @returns {@as any} The result.
 */
export const create = createCreateFunction({})

const user = create(
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
