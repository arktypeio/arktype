import {
    FilterByValue,
    Evaluate,
    MergeAll,
    RemoveSpaces,
    Split,
    WithDefaults,
    Or,
    And,
    DeepEvaluate
} from "@re-do/utils"
import {
    OrDefinition,
    ListDefinition,
    OptionalDefinition,
    BuiltInTypeName,
    BuiltInTypes,
    UnvalidatedObjectDefinition,
    FunctionDefinition,
    UnvalidatedDefinition,
    StringLiteralDefinition,
    NumericStringLiteralDefinition
} from "./common.js"
import { DefinitionTypeError, UnknownTypeError } from "./errors.js"

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
> = Or<
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

export type ParseStringDefinitionRecurse<
    Fragment extends string,
    TypeSet,
    Options extends ParseTypeRecurseOptions
> = Fragment extends OrDefinition<infer First, infer Second>
    ? ParseStringOrDefinitionRecurse<First, Second, TypeSet, Options>
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

export type ParseType<
    Definition,
    TypeSet,
    Options extends ParseTypeOptions = {}
> = ParseTypeRecurse<
    Definition,
    TypeSet,
    WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
>

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
