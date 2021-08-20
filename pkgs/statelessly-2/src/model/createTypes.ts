import { ExcludeByValue, FilterByValue, Narrow, Exact } from "@re-do/utils"

type PrimitiveTypes = {
    string: string
    boolean: boolean
    number: number
    null: null
}

type PrimitivePropDef = keyof PrimitiveTypes

type AtomicPropDef<DefinedType extends string> = DefinedType | PrimitivePropDef

type ListPropDef<ListItem extends string = string> = `${ListItem}[]`

type OrPropDef<
    First extends string = string,
    Second extends string = string
> = `${First} | ${Second}`

type PropDefGroup<Group extends string = string> = `(${Group})`

type OptionalPropDef<OptionalType extends string = string> = `${OptionalType}?`

type ValidatedPropDefRecurse<
    DefinedType extends string,
    Fragment extends string
> = Fragment extends PropDefGroup<infer Group>
    ? `(${ValidatedPropDefRecurse<DefinedType, Group>})`
    : Fragment extends ListPropDef<infer ListItem>
    ? `${ValidatedPropDefRecurse<DefinedType, ListItem>}[]`
    : Fragment extends OrPropDef<infer First, infer Second>
    ? `${ValidatedPropDefRecurse<
          DefinedType,
          First
      >} | ${ValidatedPropDefRecurse<DefinedType, Second>}`
    : Fragment extends AtomicPropDef<DefinedType>
    ? Fragment
    : `Unable to determine the type of '${Fragment}'.`

type ValidatedMetaPropDef<
    DefinedType extends string,
    PropDef extends string
> = PropDef extends OptionalPropDef<infer OptionalType>
    ? `${ValidatedPropDefRecurse<DefinedType, OptionalType>}?`
    : ValidatedPropDefRecurse<DefinedType, PropDef>

export type ValidatedPropDef<
    DefinedType extends string,
    PropDef extends string
> = ValidatedMetaPropDef<DefinedType, PropDef>

type TypeDefinition<Root, Fields, TypeName extends keyof Fields> = {
    [PropName in keyof Fields[TypeName]]:
        | TypeDefinition<Root, Fields[TypeName], PropName>
        | ValidatedPropDef<keyof Root & string, Fields[TypeName][PropName]>
}

export type TypeDefinitions<Definitions> = {
    [TypeName in keyof Definitions]: TypeDefinition<
        Definitions,
        Definitions,
        TypeName
    >
}

export type ParsePropType<
    Definitions extends TypeDefinitions<Definitions>,
    PropDefinition extends string | object
> = PropDefinition extends string
    ? ParseMetaPropType<Definitions, PropDefinition & string>
    : {
          [KeyName in keyof PropDefinition]: ParsePropType<
              Definitions,
              PropDefinition[KeyName] & (string | object)
          >
      }

type ParseMetaPropType<
    Definitions extends TypeDefinitions<Definitions>,
    PropDefinition extends string
> = PropDefinition extends OptionalPropDef<infer OptionalType>
    ? ParsePropTypeRecurse<Definitions, OptionalType> | undefined
    : ParsePropTypeRecurse<Definitions, PropDefinition>

type ParsePropTypeRecurse<
    Definitions extends TypeDefinitions<Definitions>,
    PropDefinition extends string
> = PropDefinition extends PropDefGroup<infer Group>
    ? ParsePropTypeRecurse<Definitions, Group>
    : PropDefinition extends ListPropDef<infer ListItem>
    ? ParsePropTypeRecurse<Definitions, ListItem>[]
    : PropDefinition extends OrPropDef<infer First, infer Second>
    ?
          | ParsePropTypeRecurse<Definitions, First>
          | ParsePropTypeRecurse<Definitions, Second>
    : PropDefinition extends keyof Definitions
    ? ParseType<Definitions, PropDefinition>
    : PropDefinition extends keyof PrimitiveTypes
    ? PrimitiveTypes[PropDefinition]
    : never

export type ParseTypes<Definitions extends TypeDefinitions<Definitions>> = {
    [TypeName in keyof Definitions]: ParseType<Definitions, TypeName>
}

export type ParseType<
    Definitions extends TypeDefinitions<Definitions>,
    TypeName extends keyof Definitions
> = {
    [PropName in keyof ExcludeByValue<
        Definitions[TypeName],
        OptionalPropDef
    >]: ParsePropType<Definitions, Definitions[TypeName][PropName]>
} &
    {
        [PropName in keyof FilterByValue<
            Definitions[TypeName],
            OptionalPropDef
        >]?: Definitions[TypeName][PropName] extends OptionalPropDef<
            infer OptionalType
        >
            ? ParsePropType<Definitions, OptionalType>
            : never
    }

const getType = <
    Definitions extends TypeDefinitions<Definitions>,
    Name extends keyof Definitions
>(
    t: Narrow<Definitions>,
    name: Name
) => "" as any as ParseType<Definitions, Name>

const getTypes = <Definitions extends TypeDefinitions<Definitions>>(
    t: Narrow<Definitions>
) => "" as any as ParseTypes<Definitions>

getTypes({
    user: {
        name: "string",
        bestFriend: "user",
        friends: "user[]",
        groups: "group[]",
        nested: {
            another: "string",
            user: "user[]",
            foop: 5
        }
    },
    group: {
        name: "string",
        description: "string?",
        members: "user[]",
        owner: "user"
    }
}).group.owner.nested.user
