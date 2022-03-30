import {
    Evaluate,
    Narrow,
    Exact,
    IsAny,
    WithDefaults,
    isEmpty
} from "@re-/tools"
import { Root } from "./definitions/index.js"
import { ParseContext, defaultParseContext } from "./definitions/parser.js"
import { stringifyErrors, ValidationErrors } from "./errors.js"
import {
    CheckSpaceResolutions,
    compile,
    Space,
    TypeSpace,
    TypeSpaceOptions
} from "./space.js"
import { ReferencesTypeConfig, typeDefProxy } from "./internal.js"
import { DefaultParseTypeContext } from "./definitions/internal.js"

export type Definition = Root.Definition

export type Validate<Def, Space> = IsAny<Def> extends true
    ? Def
    : Root.Validate<Def, Space>

export type TypeOf<
    Def,
    Space,
    Options extends ParseOptions = {},
    SpaceConfig extends TypeSpaceOptions<keyof Checked & string> = {},
    OptionsWithDefaults extends Required<ParseOptions> = WithDefaults<
        ParseOptions,
        Options,
        DefaultParseOptions
    >,
    Checked = CheckSpaceResolutions<Space>
> = IsAny<Def> extends true
    ? Def
    : Root.TypeOf<
          Root.Parse<Def, Space, DefaultParseTypeContext>,
          Checked,
          // @ts-ignore
          OptionsWithDefaults & {
              seen: {}
              spaceConfig: SpaceConfig
          }
      >

export type ReferencesTypeOptions = {
    asTuple?: boolean
    asList?: boolean
    filter?: string
}

export type ReferencesOf<
    Def extends Root.Definition,
    Space = {},
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
> = Root.ReferencesOf<Def, Space, Config>

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

const createValidateFunction =
    (allows: ReturnType<typeof Root.parse>["allows"]): ValidateFunction =>
    (value, options) => {
        const errors = allows(value, options)
        if (isEmpty(errors)) {
            return {} as any
        }
        if (options?.errorFormat === "map") {
            return { errors }
        }
        return { errors: stringifyErrors(errors) }
    }

export const createCreateFunction =
    <PredefinedSpace extends TypeSpace>(
        predefinedSpace: Narrow<PredefinedSpace>
    ): CreateFunction<PredefinedSpace> =>
    (definition, config) => {
        const context: ParseContext = {
            ...defaultParseContext,
            space: config?.space ?? (predefinedSpace as any)
        }
        const { allows, references, generate } = Root.parse(definition, context)
        const validate = createValidateFunction(allows)
        return {
            type: typeDefProxy,
            space: context.space,
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

export type CreateFunction<PredefinedSpace extends TypeSpace> = <
    Def,
    Options extends ModelConfig,
    ActiveSpace extends TypeSpace = PredefinedSpace
>(
    definition: Validate<Narrow<Def>, ActiveSpace>,
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
    Definition,
    Space extends TypeSpace,
    Options extends ParseOptions,
    ModelType = TypeOf<
        Definition,
        Space["definitions"],
        WithDefaults<ParseOptions, Options, DefaultParseOptions>
    >
> = Evaluate<{
    definition: Definition
    type: ModelType
    space: Space
    config: ModelConfig
    validate: ValidateFunction
    assert: (value: unknown, options?: AssertOptions) => void
    generate: (options?: GenerateOptions) => ModelType
    references: (
        options?: ReferencesOptions
    ) => ReferencesOf<Definition, Space, { asList: true }>
}>

// Exported create function is equivalent to create from an empty compile call
export const create = createCreateFunction({ definitions: {}, config: {} })

// compile({ group: { members: "string[]" } }).create({
//     name: "string",
//     age: "number",
//     groups: "group[]"
// }).type

// const user = create(
//     { name: "string", age: "number", groups: "group[]" },
//     { space: { definitions: { group: { members: "string[]" } }, config: {} } }
// )
