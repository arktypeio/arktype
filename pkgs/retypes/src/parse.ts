import {
    Evaluate,
    MergeAll,
    WithDefaults,
    Narrow,
    Exact,
    Segment,
    transform,
    DeepTreeOf
} from "@re-do/utils"
import { UnvalidatedTypeSet, formatTypes, typeDefProxy } from "./common.js"
import { getDefault, GetDefaultOptions } from "./defaults.js"
import { TypeSet } from "./compile.js"
import { assert, checkErrors, ValidateOptions } from "./validate.js"
import { Parse, Validate } from "./definition.js"
import { Recursible, Root, Shallow } from "./components"

// const analyzeOrType = (args: AnalyzeTypeArgs<OrDefinition>) => {}

type AggregatedTypeAnalysis = Pick<
    TypeAnalysis,
    "components" | "references" | "defaultValue"
>

const getEmptyAggregatedAnalysis = (): AggregatedTypeAnalysis => ({
    components: [],
    references: [],
    defaultValue: []
})

const analyzeObjectType = ({
    definition,
    path,
    ...rest
}: AnalyzeTypeArgs<Recursible.Definition>): TypeAnalysis => {
    const aggregated = getEmptyAggregatedAnalysis()
    const nested = transform(
        definition,
        ([k, itemDefinition]: [string | number, Recursible.Definition]) => {
            const itemAnalysis = analyzeType({
                definition: itemDefinition,
                path: [...path, k],
                ...rest
            })
            aggregated.components.push(...itemAnalysis.components)
            aggregated.references.push(...itemAnalysis.references)
            aggregated.defaultValue.push(itemAnalysis.defaultValue)
            return [k, itemAnalysis]
        }
    )
    return {
        path,
        nested,
        ...aggregated
    }
}

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

export type AnalyzeTypeArgs<
    Definition extends Root.Definition = Root.Definition
> = {
    definition: Definition
    typeSet: UnvalidatedTypeSet
    path: Segment[]
    seen: string[]
}

export type TypeAnalysis = {
    path: Segment[]
    defaultValue: any
    components: Shallow.Definition[]
    references: string[]
    nested?: DeepTreeOf<TypeAnalysis, true>
}

export const analyzeType = (args: AnalyzeTypeArgs): TypeAnalysis => {
    const { definition, typeSet, path, seen } = args
    if (typeof definition === "number") {
        return {
            path,
            defaultValue: definition,
            components: [definition],
            references: []
        }
    }
    if (typeof definition === "string") {
        //return analyzeStringType()
    }
    if (typeof definition === "object") {
        return analyzeObjectType(args as AnalyzeTypeArgs<Recursible.Definition>)
    }
    return {} as any
}

export const createParseFunction =
    <PredefinedTypeSet extends UnvalidatedTypeSet>(
        predefinedTypeSet: PredefinedTypeSet
    ) =>
    <
        Def,
        ParseOptions extends ParseTypeOptions,
        ActiveTypeSet = PredefinedTypeSet
    >(
        definition: Validate<Narrow<Def>, keyof ActiveTypeSet & string>,
        options?: Narrow<
            ParseOptions & {
                typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>
            }
        >
    ) => {
        const formattedDefinition = formatTypes(definition)
        const activeTypeSet = options?.typeSet ?? predefinedTypeSet
        return {
            definition: formattedDefinition,
            type: typeDefProxy as Parse<Def, ActiveTypeSet, ParseOptions>,
            typeSet: activeTypeSet as ActiveTypeSet,
            checkErrors: (value: unknown, options: ValidateOptions = {}) =>
                checkErrors(
                    value,
                    formattedDefinition as any,
                    activeTypeSet as any,
                    options
                ),
            assert: (value: unknown, options: ValidateOptions = {}) =>
                assert(
                    value,
                    formattedDefinition as any,
                    activeTypeSet as any,
                    options
                ),
            getDefault: (options: GetDefaultOptions = {}) =>
                getDefault(
                    formattedDefinition as any,
                    activeTypeSet as any,
                    options
                ) as Parse<Def, ActiveTypeSet, ParseOptions>
        }
    }

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a typeset as its second parameter
export const parse = createParseFunction({})

export type ParseTypeSet<TypeSet, Options extends ParseTypeOptions = {}> = {
    [TypeName in keyof TypeSet]: Parse<TypeName, TypeSet, Options>
}

export type ParseTypeSetDefinitions<
    Definitions,
    Options extends ParseTypeOptions = {}
> = ParseTypeSet<MergeAll<Definitions>, Options>

export type ParsedTypeSet<TypeSet = UnvalidatedTypeSet> =
    UnvalidatedTypeSet extends TypeSet
        ? Record<string, ParsedType>
        : {
              [TypeName in keyof TypeSet]: Evaluate<
                  ParsedType<TypeName, TypeSet, {}>
              >
          }

export type ParseFunction<
    PredefinedTypeSet extends UnvalidatedTypeSet = UnvalidatedTypeSet
> = <
    Definition,
    Options extends ParseTypeOptions,
    ActiveTypeSet = PredefinedTypeSet
>(
    definition: UnvalidatedTypeSet extends ActiveTypeSet
        ? Root.Definition
        : Validate<Narrow<Definition>, keyof ActiveTypeSet & string>,
    options?: Narrow<
        Options & {
            typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>
        }
    >
) => UnvalidatedTypeSet extends ActiveTypeSet
    ? ParsedType
    : ParsedType<Definition, ActiveTypeSet, Options>

export type ParsedType<
    Definition = Root.Definition,
    TypeSet = UnvalidatedTypeSet,
    Options = {},
    ParseResult = Root.Definition extends Definition
        ? any
        : Parse<Definition, TypeSet, Options>
> = {
    definition: Definition
    type: ParseResult
    typeSet: Evaluate<TypeSet>
    checkErrors: (value: unknown, options?: ValidateOptions) => string
    assert: (value: unknown, options?: ValidateOptions) => void
    getDefault: (options?: GetDefaultOptions) => ParseResult
}
