import {
    ExcludeByValue,
    FilterByValue,
    Evaluate,
    MergeAll,
    RemoveSpaces,
    Split,
    WithDefaults,
    Or,
    KeyValuate,
    NumericString,
    Cast,
    StringOrNumberFrom,
    ListPossibleTypes
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
    Options extends Required<ParseTypeRecurseOptions>,
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
    Options extends Required<ParseTypeRecurseOptions>,
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
    Options extends Required<ParseTypeRecurseOptions>
> = Evaluate<
    (
        ...args: ParseStringTupleDefinitionRecurse<Parameters, TypeSet, Options>
    ) => ParseStringDefinitionRecurse<Return, TypeSet, Options>
>

export type ParseStringOrDefinitionRecurse<
    First extends string,
    Second extends string,
    TypeSet,
    Options extends Required<ParseTypeRecurseOptions>,
    FirstParseResult = ParseStringDefinitionRecurse<First, TypeSet, Options>,
    SecondParseResult = ParseStringDefinitionRecurse<Second, TypeSet, Options>
> = FirstParseResult extends UnknownTypeError
    ? FirstParseResult
    : SecondParseResult extends UnknownTypeError
    ? SecondParseResult
    : FirstParseResult | SecondParseResult

export type ParseStringDefinitionRecurse<
    Fragment extends string,
    TypeSet,
    Options extends Required<ParseTypeRecurseOptions>
> = Fragment extends OrDefinition<infer First, infer Second>
    ? ParseStringOrDefinitionRecurse<First, Second, TypeSet, Options>
    : Fragment extends FunctionDefinition<infer Parameters, infer Return>
    ? ParseStringFunctionDefinitionRecurse<Parameters, Return, TypeSet, Options>
    : Fragment extends ListDefinition<infer ListItem>
    ? ParseStringDefinitionRecurse<ListItem, TypeSet, Options>[]
    : Fragment extends StringLiteralDefinition<infer Literal>
    ? `${Literal}`
    : Fragment extends NumericStringLiteralDefinition<infer Value>
    ? // For now this is always inferred as 'number', even the string is a literal like '5'
      Value
    : Fragment extends BuiltInTypeName
    ? BuiltInTypes[Fragment]
    : Fragment extends keyof TypeSet
    ? Or<
          Options["onCycle"] extends never ? true : false,
          Fragment extends keyof Options["seen"] ? false : true
      > extends true
        ? ParseTypeRecurse<
              TypeSet[Fragment],
              TypeSet,
              Options & { seen: { [TypeName in Fragment]: true } }
          >
        : ParseTypeRecurse<
              Options["onCycle"],
              Omit<TypeSet, "cyclic"> & { cyclic: Fragment },
              {
                  onCycle: Options["deepOnCycle"] extends true
                      ? Options["onCycle"]
                      : never
                  seen: {}
                  deepOnCycle: Options["deepOnCycle"]
              }
          >
    : UnknownTypeError<Fragment>

export type ParseObjectDefinition<
    Definition extends object,
    TypeSet,
    Options extends Required<ParseTypeRecurseOptions>,
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
    Options extends Required<ParseTypeRecurseOptions>
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
    WithDefaults<
        ParseTypeOptions,
        Options,
        { onCycle: never; seen: {}; deepOnCycle: false }
    >
>

export type ParseTypeSetDefinitions<
    Definitions,
    Options extends ParseTypeOptions = {},
    Merged = MergeAll<Definitions>
> = {
    [TypeName in keyof Merged]: ParseType<Merged[TypeName], Merged, Options>
}
