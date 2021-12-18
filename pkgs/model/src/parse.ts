import { Evaluate, Narrow, Exact, IsAny, WithDefaults } from "@re-/tools"
import { Primitive, Root, Str } from "./definition"
import { ParseContext, defaultParseContext } from "./definition/parser.js"
import { stringifyErrors, ValidationErrors } from "./errors.js"
import { format, typeOf } from "./utils.js"
import { Typespace } from "./typespace"
import { ReferencesTypeConfig, typeDefProxy } from "./internal.js"

export type Definition = Root.Definition

export type Validate<Def, Typespace> = IsAny<Def> extends true
    ? Def
    : Root.Validate<Def, Typespace>

export type Parse<
    Def,
    Space,
    Options extends ParseTypeOptions = {}
> = IsAny<Def> extends true
    ? Def
    : Root.Parse<
          Def,
          Typespace.Validate<Space>,
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
export type ValidateReferences<
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

export type DefaultParseTypeOptions = {
    onCycle: never
    seen: {}
    deepOnCycle: false
    onResolve: never
}

export type InferredMethods = {
    assert: (value: unknown, options?: AllowsOptions) => void
    check: (value: unknown, options?: AllowsOptions) => string
}

export const createParseFunction =
    <PredefinedTypespace>(
        predefinedTypespace: Narrow<PredefinedTypespace>
    ): ParseFunction<PredefinedTypespace> =>
    (definition, options) => {
        const formattedTypespace: any = format(
            options?.typespace ?? predefinedTypespace
        )
        const context: ParseContext = {
            ...defaultParseContext,
            typespace: formattedTypespace
        }
        const formattedDefinition = format(definition)
        const { allows, references, generate } = Root.parse(
            formattedDefinition,
            context
        ) as any
        const check: InferredMethods["check"] = (value, options) =>
            stringifyErrors(allows(typeOf(value), options))
        const inferredMethods: InferredMethods = {
            check,
            assert: (value, options) => {
                const errorMessage = check(value, options)
                if (errorMessage) {
                    throw new Error(errorMessage)
                }
            }
        }
        return {
            type: typeDefProxy,
            typespace: formattedTypespace,
            definition: formattedDefinition,
            allows,
            references,
            generate,
            ...inferredMethods
        } as any
    }

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a typespace as its second parameter
export const parse = createParseFunction({})

export type ParseFunction<PredefinedTypespace> = <
    Def,
    Options extends ParseTypeOptions,
    ActiveTypespace = PredefinedTypespace
>(
    definition: Validate<Narrow<Def>, ActiveTypespace>,
    options?: Narrow<
        Options & {
            typespace?: Exact<
                ActiveTypespace,
                Typespace.Validate<ActiveTypespace>
            >
        }
    >
) => Evaluate<ParsedType<Def, ActiveTypespace, Options>>

export type AllowsOptions = {
    ignoreExtraneousKeys?: boolean
}

export type ReferencesOptions = {}

export type GenerateOptions = {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle?: any
}

export type ParsedType<
    Definition,
    Typespace,
    Options,
    TypeOfParsed = Evaluate<Parse<Definition, Typespace, Options>>
> = Evaluate<{
    definition: Definition
    type: TypeOfParsed
    typespace: Evaluate<Typespace>
    check: (value: unknown, options?: AllowsOptions) => string
    assert: (value: unknown, options?: AllowsOptions) => void
    allows: (value: unknown, options?: AllowsOptions) => ValidationErrors
    generate: (options?: GenerateOptions) => TypeOfParsed
    references: () => References<Definition, { asUnorderedList: true }>
}>
