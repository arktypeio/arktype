import {
    ExcludeByValue,
    FilterByValue,
    TypeError,
    Evaluate,
    MergeAll,
    RemoveSpaces,
    Split,
    WithDefaults,
    Or,
    KeyValuate
} from "@re-do/utils"
import {
    OrDefinition,
    ListDefinition,
    OptionalDefinition,
    BuiltInTypeName,
    BuiltInTypes,
    UnvalidatedObjectDefinition,
    FunctionDefinition,
    UnvalidatedDefinition
} from "./common.js"
import { DefinitionTypeError, UnknownTypeError } from "./errors.js"

export type ParseStringDefinition<
    Definition extends string,
    TypeSet,
    Options extends Required<ParseTypeRecurseOptions>,
    ParsableDefinition extends string = RemoveSpaces<Definition>
> = ParsableDefinition extends OptionalDefinition<infer OptionalType>
    ? ParseStringDefinitionRecurse<OptionalType, TypeSet, Options> | undefined
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
    : Fragment extends keyof TypeSet
    ? Or<
          Options["onCycle"] extends never ? true : false,
          Fragment extends Options["seen"] ? false : true
      > extends true
        ? ParseTypeRecurse<
              TypeSet[Fragment],
              TypeSet,
              {
                  onCycle: Options["onCycle"]
                  seen: Options["seen"] | Fragment
                  deepOnCycle: Options["deepOnCycle"]
              }
          >
        : ParseTypeRecurse<
              Options["onCycle"],
              TypeSet & { cyclic: Fragment },
              {
                  onCycle: Options["deepOnCycle"] extends true
                      ? Options["onCycle"]
                      : never
                  seen: never
                  deepOnCycle: Options["deepOnCycle"]
              }
          >
    : Fragment extends BuiltInTypeName
    ? BuiltInTypes[Fragment]
    : UnknownTypeError<Fragment>

export type ParseObjectDefinition<
    Definition extends object,
    TypeSet,
    Options extends Required<ParseTypeRecurseOptions>
> = {
    [PropName in keyof ExcludeByValue<
        Definition,
        OptionalDefinition
    >]: ParseTypeRecurse<KeyValuate<Definition, PropName>, TypeSet, Options>
} &
    {
        [PropName in keyof FilterByValue<
            Definition,
            OptionalDefinition
        >]?: KeyValuate<Definition, PropName> extends OptionalDefinition<
            infer OptionalType
        >
            ? ParseTypeRecurse<OptionalType, TypeSet, Options>
            : TypeError<`Expected property ${Extract<
                  PropName,
                  string | number
              >} to be optional.`>
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
    seen?: string
    deepOnCycle?: boolean
}

export type ParseTypeRecurse<
    Definition,
    TypeSet,
    Options extends ParseTypeRecurseOptions
> = Definition extends string
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
        { onCycle: never; seen: never; deepOnCycle: false }
    >
>

export type ParseTypeSetDefinitions<
    Definitions,
    Options extends ParseTypeOptions = {},
    Merged = MergeAll<Definitions>
> = {
    [TypeName in keyof Merged]: ParseType<Merged[TypeName], Merged, Options>
}
