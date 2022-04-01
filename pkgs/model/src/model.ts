import {
    Evaluate,
    Narrow,
    IsAny,
    WithDefaults,
    isEmpty,
    KeyValuate
} from "@re-/tools"
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
import { ValidateSpaceResolutions, Spacefication } from "./space.js"
import {
    errorsFromCustomValidator,
    MergeObjects,
    ReferencesTypeConfig,
    typeDefProxy
} from "./internal.js"
import { DefaultParseTypeContext } from "./definitions/internal.js"

export type Definition = Root.Definition

export type Validate<Def, Resolutions> = IsAny<Def> extends true
    ? Def
    : Root.Validate<Def, Resolutions>

export type TypeOf<
    Def,
    Resolutions,
    Options extends ParseConfig = {},
    OptionsWithDefaults extends Required<ParseConfig> = WithDefaults<
        ParseConfig,
        Options,
        DefaultParseOptions
    >,
    Checked = ValidateSpaceResolutions<Resolutions>
> = IsAny<Def> extends true
    ? Def
    : Root.TypeOf<
          Root.Parse<Def, Resolutions, DefaultParseTypeContext>,
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

export type ReferencesOf<
    Def extends Root.Definition,
    Resolutions = {},
    Options extends ReferencesTypeOptions = {},
    Config extends ReferencesTypeConfig = WithDefaults<
        ReferencesTypeOptions,
        Options,
        {
            asTuple: false
            asList: false
            filter: string
        }
    >
> = Root.ReferencesOf<Def, Resolutions, Config>

// Just use unknown for now since we don't have all the definitions yet
// but we still want to allow references to other declared types
export type CheckReferences<
    Def,
    DeclaredTypeName extends string
> = Root.Validate<
    Def,
    {
        [TypeName in DeclaredTypeName]: "unknown"
    }
>

export type ParseConfig = {
    onCycle?: Definition
    deepOnCycle?: boolean
    onResolve?: Definition
}

export type DefaultParseOptions = {
    onCycle: never
    deepOnCycle: false
    onResolve: never
}

export type ReferencesConfig = {}

export type GenerateConfig = {
    // By default, generate will throw if it encounters a cyclic required type
    // If this options is provided, it will return its value instead
    onRequiredCycle?: any
}

export type ModelConfig = {
    parse?: ParseConfig
    validate?: ValidateConfig
    generate?: GenerateConfig
    references?: ReferencesConfig
    space?: Spacefication
}

type ValidationErrorFormats = {
    message: string
    map: ValidationErrors
}

type ValidationErrorFormat = keyof ValidationErrorFormats

export type ValidateConfig = {
    ignoreExtraneousKeys?: boolean
    errorFormat?: ValidationErrorFormat
    validator?: CustomValidator
}

export type CustomValidator = (
    value: unknown,
    errors: ValidationErrors,
    ctx: Omit<InheritableMethodContext<any, any>, "components">
) => string | ValidationErrors

export type AssertOptions = Omit<ValidateConfig, "errorFormat">

export type ValidationResult<ErrorFormat extends ValidationErrorFormat> = {
    errors?: ValidationErrorFormats[ErrorFormat]
}

export type ValidateFunction = <Options extends ValidateConfig>(
    value: unknown,
    options?: Options
) => ValidationResult<
    Options["errorFormat"] extends ValidationErrorFormat
        ? Options["errorFormat"]
        : "message"
>

const createRootValidate =
    (
        validate: ReturnType<typeof Root.parse>["validate"],
        definition: Root.Definition,
        customValidator: CustomValidator | undefined
    ): ValidateFunction =>
    (value, options) => {
        let errors = validate(value, options)
        if (customValidator) {
            errors = errorsFromCustomValidator(customValidator, [
                value,
                errors,
                { def: definition, ctx: defaultParseContext }
            ])
        }
        if (isEmpty(errors)) {
            return {} as any
        }
        if (options?.errorFormat === "map") {
            return { errors }
        }
        return { errors: stringifyErrors(errors) }
    }

export const createCreateFunction =
    <PredefinedSpace extends Spacefication | null>(
        predefinedSpace: Narrow<PredefinedSpace>
    ): CreateFunction<PredefinedSpace> =>
    (definition, config) => {
        if (predefinedSpace && config?.space) {
            throw new Error(duplicateSpaceError)
        }
        const space: any = predefinedSpace ??
            config?.space ?? { resolutions: {} }
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
        } = Root.parse(definition, context)
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
                const { errors } = validate(value, options)
                if (errors) {
                    throw new Error(errors)
                }
            }
        } as any
    }

export type CreateFunction<PredefinedSpace extends Spacefication | null> = <
    Def,
    Options extends ModelConfig = {},
    ActiveSpace extends Spacefication = PredefinedSpace extends null
        ? Options["space"] extends Spacefication
            ? Options["space"]
            : { resolutions: {} }
        : PredefinedSpace
>(
    definition: Validate<Narrow<Def>, ActiveSpace["resolutions"]>,
    // TS has a problem inferring the narrowed type of a function hence the intersection hack
    // If removing it doesn't break any types or tests, do it!
    options?: Narrow<Options> & { validate?: { validator?: CustomValidator } }
) => Model<
    Def,
    Evaluate<ActiveSpace>,
    Options["parse"] extends ParseConfig ? Options["parse"] : {}
>

export type Model<
    Def,
    Space extends Spacefication,
    Options extends ParseConfig,
    SpaceParseConfig extends ParseConfig = KeyValuate<
        Space["config"],
        "parse"
    > extends ParseConfig
        ? KeyValuate<Space["config"], "parse">
        : {},
    ModelType = TypeOf<
        Def,
        Space["resolutions"],
        WithDefaults<
            ParseConfig,
            MergeObjects<SpaceParseConfig, Options>,
            DefaultParseOptions
        >
    >
> = Evaluate<{
    definition: Def
    type: ModelType
    space: Space
    config: ModelConfig
    validate: ValidateFunction
    assert: (value: unknown, options?: AssertOptions) => void
    generate: (options?: GenerateConfig) => ModelType
    references: (
        options?: ReferencesConfig
    ) => ReferencesOf<Def, Space["resolutions"], { asList: true }>
}>

export const create = createCreateFunction(null)
