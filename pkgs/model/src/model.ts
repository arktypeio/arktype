import { Evaluate, Narrow, IsAny, WithDefaults, isEmpty } from "@re-/tools"
import { Root } from "./definitions/index.js"
import { ParseContext, defaultParseContext } from "./definitions/parser.js"
import { stringifyErrors, ValidationErrors } from "./errors.js"
import {
    ValidateSpaceResolutions,
    Spacefication,
    TypeSpaceOptions,
    ExtractTypeSpaceOptions,
    SpaceOptions
} from "./space.js"
import { ReferencesTypeConfig, typeDefProxy } from "./internal.js"
import { DefaultParseTypeContext } from "./definitions/internal.js"

export type Definition = Root.Definition

export type Validate<Def, Resolutions> = IsAny<Def> extends true
    ? Def
    : Root.Validate<Def, Resolutions>

export type TypeOf<
    Def,
    Resolutions,
    Options extends ParseOptions = {},
    SpaceConfig extends TypeSpaceOptions<keyof Checked & string> = {},
    OptionsWithDefaults extends Required<ParseOptions> = WithDefaults<
        ParseOptions,
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
              space: SpaceConfig
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

export type ParseOptions = {
    onCycle?: Definition
    deepOnCycle?: boolean
    onResolve?: Definition
}

export type DefaultParseOptions = {
    onCycle: never
    deepOnCycle: false
    onResolve: never
}

export type ReferencesOptions = {}

export type GenerateOptions = {
    // By default, generate will throw if it encounters a cyclic required type
    // If this options is provided, it will return its value instead
    onRequiredCycle?: any
}

export type ModelConfig = {
    parse?: ParseOptions
    validate?: ValidateConfig
    generate?: GenerateOptions
    references?: ReferencesOptions
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

export type ValidateOptions = Omit<ValidateConfig, "validator">

export type CustomValidator = (
    value: unknown,
    errors: ValidationErrors,
    ctx: ParseContext
) => string | ValidationErrors

export type AssertOptions = Omit<ValidateConfig, "errorFormat">

export type ValidationResult<ErrorFormat extends ValidationErrorFormat> = {
    errors?: ValidationErrorFormats[ErrorFormat]
}

export type ValidateFunction = <Options extends ValidateOptions>(
    value: unknown,
    options?: Options
) => ValidationResult<
    Options["errorFormat"] extends ValidationErrorFormat
        ? Options["errorFormat"]
        : "message"
>

const createRootValidate =
    (validate: ReturnType<typeof Root.parse>["validate"]): ValidateFunction =>
    (value, options) => {
        const errors = validate(value, options)
        if (isEmpty(errors)) {
            return {} as any
        }
        if (options?.errorFormat === "map") {
            return { errors }
        }
        return { errors: stringifyErrors(errors) }
    }

export const createCreateFunction =
    <PredefinedSpace extends Spacefication>(
        predefinedSpace: Narrow<PredefinedSpace>
    ): CreateFunction<PredefinedSpace> =>
    (definition, config) => {
        const context: ParseContext = {
            ...defaultParseContext,
            config: {
                ...config,
                // @ts-ignore
                space: (config?.space ?? predefinedSpace) as any
            }
        }
        const {
            validate: internalValidate,
            references,
            generate
        } = Root.parse(definition, context)
        const validate = createRootValidate(internalValidate)
        return {
            type: typeDefProxy,
            space: context.config.space,
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

export type CreateFunction<PredefinedSpace extends Spacefication> = <
    Def,
    Options extends ModelConfig = {},
    ActiveSpace extends Spacefication = PredefinedSpace
>(
    definition: Validate<Narrow<Def>, ActiveSpace["resolutions"]>,
    options?: Narrow<
        Options & {
            space?: ActiveSpace
        }
    >
) => Model<
    Def,
    Evaluate<ActiveSpace>,
    Options["parse"] extends ParseOptions ? Options["parse"] : {}
>

export type Model<
    Def,
    Space extends Spacefication,
    Options extends ParseOptions,
    SpaceConfig extends SpaceOptions<
        Space["resolutions"]
    > = Space["config"] extends SpaceOptions<Space["resolutions"]>
        ? Space["config"]
        : {},
    ModelType = TypeOf<
        Def,
        Space["resolutions"],
        WithDefaults<ParseOptions, Options, DefaultParseOptions>,
        ExtractTypeSpaceOptions<SpaceConfig>
    >
> = Evaluate<{
    definition: Def
    type: ModelType
    space: Space
    config: ModelConfig
    validate: ValidateFunction
    assert: (value: unknown, options?: AssertOptions) => void
    generate: (options?: GenerateOptions) => ModelType
    references: (
        options?: ReferencesOptions
    ) => ReferencesOf<Def, Space["resolutions"], { asList: true }>
}>

// Exported create function is equivalent to create from an empty compile call
export const create = createCreateFunction({ resolutions: {}, config: {} })
