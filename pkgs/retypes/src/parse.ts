import { Evaluate, MergeAll, Narrow, Exact, TreeOf } from "@re-do/utils"
import { Parse, Validate } from "./definition.js"
import { Root } from "./components"
import {
    AllowsOptions,
    ParseContext,
    ReferencesOptions,
    GenerateOptions
} from "./components/parser.js"
import { stringifyErrors, ValidationErrors } from "./components/errors.js"
import { format } from "./format.js"
import { TypeSet } from "./typeSet/typeSet.js"
import { typeOf } from "./typeOf.js"
import { typeDefProxy } from "./common.js"

export type ParseTypeRecurseOptions = Required<ParseTypeOptions>

export type ParseTypeOptions = {
    onCycle?: Root.Definition
    seen?: any
    deepOnCycle?: boolean
    onResolve?: Root.Definition
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
    <PredefinedTypeSet>(
        predefinedTypeSet: Narrow<PredefinedTypeSet>
    ): ParseFunction<PredefinedTypeSet> =>
    (definition, options) => {
        const formattedTypeSet: any = format(
            options?.typeSet ?? predefinedTypeSet
        )
        const context: ParseContext<any> = {
            typeSet: formattedTypeSet,
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
            typeSet: formattedTypeSet,
            definition: formattedDefinition,
            allows,
            references,
            generate,
            ...inferredMethods
        } as any
    }

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a typeset as its second parameter
export const parse = createParseFunction({})

export type ParseFunction<PredefinedTypeSet> = <
    Def,
    Options extends ParseTypeOptions,
    ActiveTypeSet = PredefinedTypeSet
>(
    definition: Validate<Narrow<Def>, ActiveTypeSet>,
    options?: Narrow<
        Options & {
            typeSet?: Exact<ActiveTypeSet, TypeSet.Validate<ActiveTypeSet>>
        }
    >
) => Evaluate<ParsedType<Def, ActiveTypeSet, Options>>

export type ParsedType<
    Definition,
    TypeSet,
    Options,
    TypeOfParsed = Evaluate<Parse<Definition, TypeSet, Options>>
> = Evaluate<{
    definition: Definition
    type: TypeOfParsed
    typeSet: TypeSet
    check: (value: unknown, options?: AllowsOptions) => string
    assert: (value: unknown, options?: AllowsOptions) => void
    allows: (value: unknown, options?: AllowsOptions) => ValidationErrors
    generate: (options?: GenerateOptions) => TypeOfParsed
    references: (options?: ReferencesOptions) => TreeOf<string[], true>
}>
