import {
    ExcludeByValue,
    FilterByValue,
    TypeError,
    Evaluate
} from "@re-do/utils"
import {
    GroupedType,
    OrType,
    ListType,
    OptionalType,
    BuiltInType,
    BuiltInTypeMap
} from "./builtin"

type ParseTypeString<
    TypeSet,
    PropDefinition extends string
> = PropDefinition extends OptionalType<infer OptionalType>
    ? ParseTypeStringRecurse<TypeSet, OptionalType> | undefined
    : ParseTypeStringRecurse<TypeSet, PropDefinition>

type ParseTypeStringRecurse<
    TypeSet,
    PropDefinition extends string
> = PropDefinition extends GroupedType<infer Group>
    ? ParseTypeStringRecurse<TypeSet, Group>
    : PropDefinition extends ListType<infer ListItem>
    ? ParseTypeStringRecurse<TypeSet, ListItem>[]
    : PropDefinition extends OrType<infer First, infer Second>
    ?
          | ParseTypeStringRecurse<TypeSet, First>
          | ParseTypeStringRecurse<TypeSet, Second>
    : PropDefinition extends keyof TypeSet
    ? ParseType<TypeSet, TypeSet[PropDefinition]>
    : PropDefinition extends BuiltInType
    ? BuiltInTypeMap[PropDefinition]
    : TypeError<`Unable to parse the type of '${PropDefinition}'.`>

type ParseTypeObject<TypeSet, Definition extends object> = {
    [PropName in keyof ExcludeByValue<Definition, OptionalType>]: ParseType<
        TypeSet,
        Definition[PropName]
    >
} &
    {
        [PropName in keyof FilterByValue<
            Definition,
            OptionalType
        >]?: Definition[PropName] extends OptionalType<infer OptionalType>
            ? ParseType<TypeSet, OptionalType>
            : TypeError<`Expected property ${Extract<
                  PropName,
                  string | number
              >} to be optional.`>
    }

export type ParseTypeSet<TypeSet> = {
    [TypeName in keyof TypeSet]: ParseType<TypeSet, TypeSet[TypeName]>
}

export type ParseType<TypeSet, Definition> = Definition extends string
    ? ParseTypeString<TypeSet, Definition>
    : Definition extends object
    ? Evaluate<ParseTypeObject<TypeSet, Definition>>
    : TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>
