import {
    Evaluate,
    Narrow,
    Exact,
    TreeOf,
    IsAny,
    WithDefaults
} from "@re-/utils"
import { Root } from "./definition"
import {
    AllowsOptions,
    ParseContext,
    ReferencesOptions,
    GenerateOptions
} from "./definition/parser.js"
import { stringifyErrors, ValidationErrors } from "./errors.js"
import { format } from "./format.js"
import { TypeSpace } from "./typespace"
import { typeOf } from "./typeOf.js"
import { typeDefProxy } from "./internal.js"

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
          TypeSpace.Validate<Space>,
          WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
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
            typespace: formattedTypespace,
            path: [],
            seen: [],
            shallowSeen: []
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
                TypeSpace.Validate<ActiveTypespace>
            >
        }
    >
) => Evaluate<ParsedType<Def, ActiveTypespace, Options>>

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
    references: (options?: ReferencesOptions) => TreeOf<string[], true>
}>
