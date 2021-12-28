import {
    Evaluate,
    Narrow,
    Exact,
    IsAny,
    WithDefaults,
    isEmpty
} from "@re-/tools"
import { Primitive, Root, Str } from "./definitions"
import { ParseContext, defaultParseContext } from "./definitions/parser.js"
import { stringifyErrors, ValidationErrors } from "./errors.js"
import { format, typeOf } from "./utils.js"
import { CheckSpaceResolutions } from "./compile"
import { ReferencesTypeConfig, typeDefProxy } from "./internal.js"

export type Definition = Root.Definition

export type Check<Def, Space> = IsAny<Def> extends true
    ? Def
    : Root.Check<Def, Space>

export type Parse<
    Def,
    Space,
    Options extends ParseTypeOptions = {}
> = IsAny<Def> extends true
    ? Def
    : Root.Parse<
          Def,
          CheckSpaceResolutions<Space>,
          WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
      >

export type ReferencesTypeOptions = {
    asUnorderedList?: boolean
    asList?: boolean
    filter?: string
}

export type References<
    Def extends Root.Definition,
    Options extends ReferencesTypeOptions = {},
    Config extends ReferencesTypeConfig = WithDefaults<
        ReferencesTypeOptions,
        Options,
        { asUnorderedList: false; asList: false; filter: string }
    >
> = Def extends Primitive.Definition
    ? Primitive.References<Def, Config>
    : Def extends string
    ? Str.References<Def, Config>
    : {
          [K in keyof Def]: References<Def[K], Config>
      }

// Just use unknown for now since we don't have all the definitions yet
// but we still want to allow references to other declared types
export type CheckReferences<Def, DeclaredTypeName extends string> = Root.Check<
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
        const formattedDefinition = format(definition)
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
    Options extends ParseTypeOptions,
    ActiveSpace = PredefinedSpace
>(
    definition: Check<Narrow<Def>, ActiveSpace>,
    options?: Narrow<
        Options & {
            space?: Exact<ActiveSpace, CheckSpaceResolutions<ActiveSpace>>
        }
    >
) => Evaluate<Model<Def, ActiveSpace, Options>>

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
    ModelType = Evaluate<Parse<Definition, Space, Options>>
> = Evaluate<{
    definition: Definition
    type: ModelType
    space: Evaluate<Space>
    validate: ValidateFunction
    assert: (value: unknown, options?: AssertOptions) => void
    generate: (options?: GenerateOptions) => ModelType
    references: () => References<Definition, { asUnorderedList: true }>
}>
