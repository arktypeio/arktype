import {
    FilterByValue,
    Evaluate,
    MergeAll,
    RemoveSpaces,
    Split,
    WithDefaults,
    Or as Either,
    And,
    DeepEvaluate,
    Narrow,
    Exact,
    Segment,
    transform,
    DeepTreeOf,
    ElementOf,
    List,
    Unlisted,
    ExcludeNever,
    StringifyPossibleTypes
} from "@re-do/utils"
import {
    // OrDefinition,
    ListDefinition,
    OptionalDefinition,
    BuiltInTypeName,
    BuiltInTypes,
    UnvalidatedObjectDefinition,
    FunctionDefinition,
    UnvalidatedDefinition,
    StringLiteralDefinition,
    NumericStringLiteralDefinition,
    UnvalidatedTypeSet,
    formatTypes,
    typeDefProxy,
    DefinitionLeaf
} from "./common.js"
import { getDefault, GetDefaultOptions } from "./defaults.js"
import { TypeDefinition, TypeSet } from "./definitions.js"
import {
    DefinitionTypeError,
    stringifyDefinition,
    UnknownTypeError
} from "./errors.js"
import { Or } from "./components/or.js"
import { Root } from "./components/root.js"
import { assert, checkErrors, ValidateOptions } from "./validate.js"

export type ParseStringDefinition<
    Definition extends string,
    TypeSet,
    Options extends ParseTypeRecurseOptions,
    ParsableDefinition extends string = RemoveSpaces<Definition>
> =
    // If Definition is an error, e.g. from an invalid TypeSet, return it immediately
    Definition extends UnknownTypeError
        ? Definition
        : ParsableDefinition extends OptionalDefinition<infer OptionalType>
        ?
              | ParseStringDefinitionRecurse<OptionalType, TypeSet, Options>
              | undefined
        : ParseStringDefinitionRecurse<ParsableDefinition, TypeSet, Options>

export type ParseStringTupleDefinitionRecurse<
    Definitions extends string,
    TypeSet,
    Options extends ParseTypeRecurseOptions,
    DefinitionList extends string[] = Split<Definitions, ",">
> = Definitions extends ""
    ? []
    : [
          ...{
              [Index in keyof DefinitionList]: ParseStringDefinitionRecurse<
                  DefinitionList[Index] & string,
                  TypeSet,
                  Options
              >
          }
      ]

export type ParseStringFunctionDefinitionRecurse<
    Parameters extends string,
    Return extends string,
    TypeSet,
    Options extends ParseTypeRecurseOptions
> = Evaluate<
    (
        ...args: ParseStringTupleDefinitionRecurse<Parameters, TypeSet, Options>
    ) => ParseStringDefinitionRecurse<Return, TypeSet, Options>
>

export type ParseStringOrDefinitionRecurse<
    First extends string,
    Second extends string,
    TypeSet,
    Options extends ParseTypeRecurseOptions,
    FirstParseResult = ParseStringDefinitionRecurse<First, TypeSet, Options>,
    SecondParseResult = ParseStringDefinitionRecurse<Second, TypeSet, Options>
> = FirstParseResult extends UnknownTypeError
    ? FirstParseResult
    : SecondParseResult extends UnknownTypeError
    ? SecondParseResult
    : FirstParseResult | SecondParseResult

export type ParseResolvedCyclicDefinition<
    TypeName extends keyof TypeSet,
    TypeSet,
    Options extends ParseTypeRecurseOptions
> = ParseTypeRecurse<
    Options["onCycle"],
    Omit<TypeSet, "cyclic"> & { cyclic: TypeSet[TypeName] },
    {
        onCycle: Options["deepOnCycle"] extends true
            ? Options["onCycle"]
            : never
        seen: {}
        onResolve: Options["onResolve"]
        deepOnCycle: Options["deepOnCycle"]
    }
>

export type ParseResolvedNonCyclicDefinition<
    TypeName extends keyof TypeSet,
    TypeSet,
    Options extends ParseTypeRecurseOptions
> = Either<
    Options["onResolve"] extends never ? true : false,
    TypeName extends "resolved" ? true : false
> extends true
    ? ParseTypeRecurse<
          TypeSet[TypeName],
          TypeSet,
          Options & {
              seen: { [K in TypeName]: true }
          }
      >
    : ParseType<
          Options["onResolve"],
          Omit<TypeSet, "resolved"> & { resolved: TypeSet[TypeName] },
          Options & {
              seen: { [K in TypeName]: true }
          }
      >

export type ParseResolvedDefinition<
    TypeName extends keyof TypeSet,
    TypeSet,
    Options extends ParseTypeRecurseOptions
> = TypeName extends keyof Options["seen"]
    ? Options["onCycle"] extends never
        ? ParseResolvedNonCyclicDefinition<TypeName, TypeSet, Options>
        : ParseResolvedCyclicDefinition<TypeName, TypeSet, Options>
    : ParseResolvedNonCyclicDefinition<TypeName, TypeSet, Options>

export type OrDefinition<
    First extends string = string,
    Second extends string = string
> = `${First}|${Second}`

export type ParseStringDefinitionRecurse<
    Fragment extends string,
    TypeSet,
    Options extends ParseTypeRecurseOptions
> = Fragment extends Or.Definition
    ? Or.Parse<Fragment, TypeSet, Options>
    : Fragment extends FunctionDefinition<infer Parameters, infer Return>
    ? ParseStringFunctionDefinitionRecurse<Parameters, Return, TypeSet, Options>
    : Fragment extends ListDefinition<infer ListItem>
    ? ParseStringDefinitionRecurse<ListItem, TypeSet, Options>[]
    : Fragment extends StringLiteralDefinition<infer Literal>
    ? `${Literal}`
    : Fragment extends NumericStringLiteralDefinition<infer Value>
    ? // For now this is always inferred as 'number', even if the string is a literal like '5'
      Value
    : Fragment extends BuiltInTypeName
    ? BuiltInTypes[Fragment]
    : Fragment extends keyof TypeSet
    ? ParseResolvedDefinition<Fragment, TypeSet, Options>
    : UnknownTypeError<Fragment>

const analyzeOrType = (args: AnalyzeTypeArgs<OrDefinition>) => {}

export type ParseObjectDefinition<
    Definition extends object,
    TypeSet,
    Options extends ParseTypeRecurseOptions,
    OptionalKey extends keyof Definition = keyof FilterByValue<
        Definition,
        OptionalDefinition
    >,
    RequiredKey extends keyof Definition = Exclude<
        keyof Definition,
        OptionalKey
    >
> = {
    [PropName in OptionalKey]?: Definition[PropName] extends OptionalDefinition<
        infer OptionalType
    >
        ? ParseTypeRecurse<OptionalType, TypeSet, Options>
        : `Expected property ${PropName & string} to be optional.`
} &
    {
        [PropName in RequiredKey]: ParseTypeRecurse<
            Definition[PropName],
            TypeSet,
            Options
        >
    }

export type ParseListDefinition<
    Definition extends any[],
    TypeSet,
    Options extends ParseTypeRecurseOptions
> = {
    [Index in keyof Definition]: ParseTypeRecurse<
        Definition[Index],
        TypeSet,
        Options
    >
}

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
}: AnalyzeTypeArgs<UnvalidatedObjectDefinition>): TypeAnalysis => {
    const aggregated = getEmptyAggregatedAnalysis()
    const nested = transform(
        definition,
        ([k, itemDefinition]: [string | number, UnvalidatedDefinition]) => {
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
    onCycle?: UnvalidatedDefinition
    seen?: any
    deepOnCycle?: boolean
    onResolve?: UnvalidatedDefinition
}

export type DefaultParseTypeOptions = {
    onCycle: never
    seen: {}
    deepOnCycle: false
    onResolve: never
}

export type ParseTypeRecurse<
    Definition,
    TypeSet,
    Options extends ParseTypeRecurseOptions
> = Definition extends number
    ? Definition
    : Definition extends string
    ? ParseStringDefinition<Definition, TypeSet, Options>
    : Definition extends UnvalidatedObjectDefinition
    ? Definition extends any[]
        ? Evaluate<ParseListDefinition<Definition, TypeSet, Options>>
        : Evaluate<ParseObjectDefinition<Definition, TypeSet, Options>>
    : DefinitionTypeError

export type AnalyzeTypeArgs<
    Definition extends UnvalidatedDefinition = UnvalidatedDefinition
> = {
    definition: Definition
    typeSet: UnvalidatedTypeSet
    path: Segment[]
    seen: string[]
}

export type TypeAnalysis = {
    path: Segment[]
    defaultValue: any
    components: DefinitionLeaf[]
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
        return analyzeObjectType(
            args as AnalyzeTypeArgs<UnvalidatedObjectDefinition>
        )
    }
    return {} as any
}

export type ParseType<
    Definition,
    TypeSet,
    Options extends ParseTypeOptions = {}
> = ParseTypeRecurse<
    Definition,
    TypeSet,
    WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
>

export const createParseFunction =
    <PredefinedTypeSet extends UnvalidatedTypeSet>(
        predefinedTypeSet: PredefinedTypeSet
    ) =>
    <
        Definition,
        ParseOptions extends ParseTypeOptions,
        ActiveTypeSet = PredefinedTypeSet
    >(
        definition: Root.Validate<
            Narrow<Definition>,
            keyof ActiveTypeSet & string
        >,
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
            type: typeDefProxy as ParseType<
                Definition,
                ActiveTypeSet,
                ParseOptions
            >,
            typeSet: activeTypeSet as ActiveTypeSet,
            checkErrors: (value: unknown, options: ValidateOptions = {}) =>
                checkErrors(
                    value,
                    formattedDefinition as any,
                    activeTypeSet,
                    options
                ),
            assert: (value: unknown, options: ValidateOptions = {}) =>
                assert(
                    value,
                    formattedDefinition as any,
                    activeTypeSet,
                    options
                ),
            getDefault: (options: GetDefaultOptions = {}) =>
                getDefault(
                    formattedDefinition as any,
                    activeTypeSet,
                    options
                ) as ParseType<Definition, ActiveTypeSet, ParseOptions>
        }
    }

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a typeset as its second parameter
export const parse = createParseFunction({})

export type ParseTypeSet<TypeSet, Options extends ParseTypeOptions = {}> = {
    [TypeName in keyof TypeSet]: ParseTypeRecurse<
        TypeName,
        TypeSet,
        WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
    >
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
        ? UnvalidatedDefinition
        : TypeDefinition<Narrow<Definition>, keyof ActiveTypeSet & string>,
    options?: Narrow<
        Options & {
            typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>
        }
    >
) => UnvalidatedTypeSet extends ActiveTypeSet
    ? ParsedType
    : ParsedType<Definition, ActiveTypeSet, Options>

export type ParsedType<
    Definition = UnvalidatedDefinition,
    TypeSet = UnvalidatedTypeSet,
    Options = {},
    ParseResult = UnvalidatedDefinition extends Definition
        ? any
        : ParseType<Definition, TypeSet, Options>
> = {
    definition: Definition
    type: ParseResult
    typeSet: Evaluate<TypeSet>
    checkErrors: (value: unknown, options?: ValidateOptions) => string
    assert: (value: unknown, options?: ValidateOptions) => void
    getDefault: (options?: GetDefaultOptions) => ParseResult
}
