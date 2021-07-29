import { ExcludeByValue, FilterByValue, Narrow } from "@re-do/utils"

type PrimitiveTypes = {
    string: string
    boolean: boolean
    number: number
    null: null
}

type BasePropDef<T> = string & keyof (PrimitiveTypes & T)

type ListPropDef<ListItem extends string = string> = `${ListItem}[]`

type OrPropDef<
    First extends string = string,
    Second extends string = string
> = `${First} | ${Second}`

type OptionalPropDef<OptionalType extends string = string> = `${OptionalType}?`

type PropDefGroup<Group extends string = string> = `(${Group})`

type ValidatedPropDefRecurse<
    Definitions,
    Fragment extends string
> = Fragment extends PropDefGroup<infer Group>
    ? `(${ValidatedPropDefRecurse<Definitions, Group>})`
    : Fragment extends ListPropDef<infer ListItem>
    ? `${ValidatedPropDefRecurse<Definitions, ListItem>}[]`
    : Fragment extends OrPropDef<infer First, infer Second>
    ? `${ValidatedPropDefRecurse<
          Definitions,
          First
      >} | ${ValidatedPropDefRecurse<Definitions, Second>}`
    : Fragment extends BasePropDef<Definitions>
    ? Fragment
    : `Unable to determine the type of '${Fragment}'.`

export type ValidatedPropDef<
    Definitions,
    PropDef extends string
> = PropDef extends OptionalPropDef<infer OptionalType>
    ? `${ValidatedPropDefRecurse<Definitions, OptionalType>}?`
    : ValidatedPropDefRecurse<Definitions, PropDef>

type TypeDefinition<Root, TypeName extends keyof Root> = {
    [PropName in keyof Root[TypeName]]: ValidatedPropDef<
        Root,
        Root[TypeName][PropName]
    >
}

export type TypeDefinitions<Root> = {
    [TypeName in keyof Root]: TypeDefinition<Root, TypeName>
}

type ParsePropType<
    Definitions extends TypeDefinitions<Definitions>,
    Definition extends string
> = Definition extends PropDefGroup<infer Group>
    ? ParsePropType<Definitions, Group>
    : Definition extends OptionalPropDef<infer OptionalType>
    ? ParsePropType<Definitions, OptionalType> | undefined
    : Definition extends ListPropDef<infer ListItem>
    ? ParsePropType<Definitions, ListItem>[]
    : Definition extends OrPropDef<infer First, infer Second>
    ? ParsePropType<Definitions, First> | ParsePropType<Definitions, Second>
    : Definition extends keyof Definitions
    ? ParseType<Definitions, Definition>
    : Definition extends keyof PrimitiveTypes
    ? PrimitiveTypes[Definition]
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

const getType = <T extends TypeDefinitions<T>, Name extends keyof T>(
    t: Narrow<T>,
    name: Name
) => "" as any as ParseType<T, Name>

const getTypes = <T extends TypeDefinitions<T>>(t: Narrow<T>) =>
    "" as any as ParseTypes<T>

const x = getTypes({
    user: {
        name: "string",
        bestFriend: "user",
        friends: "user[]",
        groups: "group[]"
    },
    group: {
        name: "string",
        description: "string?",
        members: "user[]",
        owner: "user"
    }
})
