import {
    ExcludeByValue,
    FilterByValue,
    Narrow,
    Exact,
    NonRecursible,
    TransformCyclic,
    Unlisted
} from "@re-do/utils"
import {
    TypeError,
    ForceEvaluate,
    Recursible,
    IsAny,
    IsAnyOrUnknown
} from "./utils"

type Evaluate<T> = T extends NonRecursible
    ? T
    : {
          [K in keyof T]: T[K]
      }

type BuiltInTypes = {
    string: string
    boolean: boolean
    number: number
    null: null
    undefined: undefined
    unknown: unknown
    any: any
}

type BuiltInPropDef = keyof BuiltInTypes

type AtomicPropDef<DefinedTypeName extends string> =
    | DefinedTypeName
    | BuiltInPropDef

type ListPropDef<ListItem extends string = string> = `${ListItem}[]`

type OrPropDef<
    First extends string = string,
    Second extends string = string
> = `${First} | ${Second}`

type PropDefGroup<Group extends string = string> = `(${Group})`

type OptionalPropDef<OptionalType extends string = string> = `${OptionalType}?`

type ValidatedPropDefRecurse<
    DefinedTypeName extends string,
    Fragment extends string
> = Fragment extends PropDefGroup<infer Group>
    ? `(${ValidatedPropDefRecurse<DefinedTypeName, Group>})`
    : Fragment extends ListPropDef<infer ListItem>
    ? `${ValidatedPropDefRecurse<DefinedTypeName, ListItem>}[]`
    : Fragment extends OrPropDef<infer First, infer Second>
    ? `${ValidatedPropDefRecurse<
          DefinedTypeName,
          First
      >} | ${ValidatedPropDefRecurse<DefinedTypeName, Second>}`
    : Fragment extends AtomicPropDef<DefinedTypeName>
    ? Fragment
    : TypeError<`Unable to determine the type of '${Fragment}'.`>

type ValidatedMetaPropDef<
    DefinedTypeName extends string,
    PropDef extends string
> = PropDef extends OptionalPropDef<infer OptionalType>
    ? `${ValidatedPropDefRecurse<DefinedTypeName, OptionalType>}?`
    : ValidatedPropDefRecurse<DefinedTypeName, PropDef>

export type ValidatedPropDef<
    DefinedTypeName extends string,
    PropDef extends string
> = ValidatedMetaPropDef<DefinedTypeName, PropDef>

export type NonStringOrRecord = Exclude<NonRecursible | any[], string>

// Check for all non-object types other than string (which are illegal) as validating
// that Definition[PropName] extends string directly results in type widening
type TypeDefinitionRecurse<TypeSet, Definition> = {
    [PropName in keyof Definition]: Definition[PropName] extends NonStringOrRecord
        ? TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>
        : Definition[PropName] extends object
        ? Exact<
              Definition[PropName],
              TypeDefinitionRecurse<TypeSet, Definition[PropName]>
          >
        : ValidatedPropDef<
              keyof TypeSet & string,
              Definition[PropName] & string
          >
}

export type TypeDefinition<TypeSet, Definition> = Definition extends string
    ? ValidatedPropDef<keyof TypeSet & string, Definition & string>
    : TypeDefinitionRecurse<TypeSet, Definition>

export type DefinedTypeSet<Definitions> = TypeDefinitionRecurse<
    Definitions,
    Definitions
>

type ParseTypeString<
    TypeSet,
    PropDefinition extends string
> = PropDefinition extends OptionalPropDef<infer OptionalType>
    ? ParseTypeStringRecurse<TypeSet, OptionalType> | undefined
    : ParseTypeStringRecurse<TypeSet, PropDefinition>

type ParseTypeStringRecurse<
    TypeSet,
    PropDefinition extends string
> = PropDefinition extends PropDefGroup<infer Group>
    ? ParseTypeStringRecurse<TypeSet, Group>
    : PropDefinition extends ListPropDef<infer ListItem>
    ? ParseTypeStringRecurse<TypeSet, ListItem>[]
    : PropDefinition extends OrPropDef<infer First, infer Second>
    ?
          | ParseTypeStringRecurse<TypeSet, First>
          | ParseTypeStringRecurse<TypeSet, Second>
    : PropDefinition extends keyof TypeSet
    ? ParseType<TypeSet, TypeSet[PropDefinition], PropDefinition>
    : PropDefinition extends keyof BuiltInTypes
    ? BuiltInTypes[PropDefinition]
    : TypeError<`Unable to parse the type of '${PropDefinition}'.`>

export type ParseTypeSet<TypeSet> = {
    [TypeName in keyof TypeSet]: ParseType<TypeSet, TypeSet[TypeName]>
}

export type ParseType<
    TypeSet,
    Definition,
    RecursiveTypeName extends keyof TypeSet | null = null
> = Definition extends string
    ? ParseTypeString<TypeSet, Definition>
    : Definition extends object
    ? RecursiveTypeName extends keyof TypeSet
        ? Evaluate<ParseTypeObject<TypeSet, Definition>> // Type<RecursiveTypeName, TypeSet>
        : Evaluate<ParseTypeObject<TypeSet, Definition>>
    : TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>

type Type<Name extends keyof TypeSet, TypeSet> = ParseTypeObject<
    TypeSet,
    TypeSet[Name]
>

type ParseTypeObject<TypeSet, Definition> = {
    [PropName in keyof ExcludeByValue<
        Definition & object,
        OptionalPropDef
    >]: ParseType<TypeSet, Definition[PropName]>
} &
    {
        [PropName in keyof FilterByValue<
            Definition & object,
            OptionalPropDef
        >]?: Definition[PropName] extends OptionalPropDef<infer OptionalType>
            ? ParseType<TypeSet, OptionalType>
            : TypeError<`Expected property ${Extract<
                  PropName,
                  string | number
              >} to be optional.`>
    }

const getTypes = <Definitions extends DefinedTypeSet<Definitions>>(
    t: Narrow<Definitions>
) => "" as any as ParseTypeSet<Definitions>

type Store = ParseTypeSet<{
    user: {
        name: "string"
        bestFriend: "user"
        friends: "user[]"
        groups: "group[]"
        nested: {
            another: "string"
            user: "user[]"
        }
    }
    group: {
        name: "string"
        description: "string?"
        members: "user[]"
        owner: "user"
    }
}>

getTypes({
    user: {
        name: "string",
        bestFriend: "user",
        friends: "user[]",
        groups: "group[]",
        nested: {
            another: "string",
            user: "user[]"
        }
    },
    group: {
        name: "string",
        description: "string?",
        members: "user[]",
        owner: "user"
    }
}).group.owner.nested.another
