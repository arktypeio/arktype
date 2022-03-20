import {
    Evaluate,
    Narrow,
    Exact,
    IsAny,
    WithDefaults,
    isEmpty
} from "@re-/tools"
import { Root, Str } from "./definitions/index.js"
import { ParseContext, defaultParseContext } from "./definitions/parser.js"
import { stringifyErrors, ValidationErrors } from "./errors.js"
import { format, typeOf } from "./utils.js"
import { CheckSpaceResolutions } from "./compile.js"
import { ReferencesTypeConfig, typeDefProxy } from "./internal.js"

export type Definition = Root.Definition

export type Validate<Def, Space> = IsAny<Def> extends true
    ? Def
    : Root.Validate<Def, Space>

export type TypeOf<
    Def,
    Space,
    Options extends ParseTypeOptions = {}
> = IsAny<Def> extends true
    ? Def
    : Root.TypeOf<
          Root.Parse<Def, Space>,
          CheckSpaceResolutions<Space>,
          WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
      >

export type ReferencesTypeOptions = {
    asTuple?: boolean
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

export type ParseTypeOptions = {
    onCycle?: Definition
    seen?: Record<string, boolean>
    deepOnCycle?: boolean
    onResolve?: Definition
}

export type DefineOptions = ParseTypeOptions & {
    validation?: ValidateOptions
    generation?: GenerateOptions
    references?: ReferencesOptions
}

export type DefaultParseTypeOptions = {
    onCycle: never
    seen: {}
    deepOnCycle: false
    onResolve: never
}

type ValidationErrorFormats = {
    message: string
    map: ValidationErrors
}

type ValidationErrorFormat = keyof ValidationErrorFormats

export type ValidateOptions = {
    ignoreExtraneousKeys?: boolean
    errorFormat?: ValidationErrorFormat
}

export type AssertOptions = Omit<ValidateOptions, "errorFormat">

export type ValidationResult<Options extends Required<ValidateOptions>> = {
    errors?: ValidationErrorFormats[Options["errorFormat"]]
}

export type ValidateFunction = <Options extends ValidateOptions>(
    value: unknown,
    options?: Options
) => ValidationResult<
    WithDefaults<
        ValidateOptions,
        Options,
        { ignoreExtraneousKeys: false; errorFormat: "message" }
    >
>

const createValidateFunction =
    (allows: ReturnType<typeof Root.parse>["allows"]): ValidateFunction =>
    (value, options) => {
        const errors = allows(typeOf(value), options)
        if (isEmpty(errors)) {
            return {} as any
        }
        if (options?.errorFormat === "map") {
            return { errors }
        }
        return { errors: stringifyErrors(errors) }
    }

export const createDefineFunction =
    <PredefinedSpace>(
        predefinedSpace: Narrow<PredefinedSpace>
    ): DefineFunction<PredefinedSpace> =>
    (definition, options) => {
        const formattedSpace: any = format(options?.space ?? predefinedSpace)
        const context: ParseContext = {
            ...defaultParseContext,
            space: formattedSpace
        }
        const formattedDefinition = format(definition) as any
        const { allows, references, generate } = Root.parse(
            formattedDefinition,
            context
        )
        const validate = createValidateFunction(allows)
        return {
            type: typeDefProxy,
            space: formattedSpace,
            definition: formattedDefinition,
            validate,
            assert: (value: unknown, options?: AssertOptions) => {
                const { errors } = validate(value, options)
                if (errors) {
                    throw new Error(errors)
                }
            },
            references,
            generate
        } as any
    }

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a space as its second parameter
export const define = createDefineFunction({})

export type DefineFunction<PredefinedSpace> = <
    Def,
    Options extends DefineOptions,
    ActiveSpace = PredefinedSpace
>(
    definition: Root.Validate<Narrow<Def>, ActiveSpace>,
    options?: Narrow<
        Options & {
            space?: Exact<ActiveSpace, CheckSpaceResolutions<ActiveSpace>>
        }
    >
) => Model<Def, Evaluate<ActiveSpace>, Options>

export type ReferencesOptions = {}

export type GenerateOptions = {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle?: any
}

export type Model<
    Definition,
    Space,
    Options,
    ModelType = TypeOf<Definition, Space, Options>
> = Evaluate<{
    definition: Definition
    type: ModelType
    space: Space
    validate: ValidateFunction
    assert: (value: unknown, options?: AssertOptions) => void
    generate: (options?: GenerateOptions) => ModelType
    references: () => ReferencesOf<Definition>[]
}>
