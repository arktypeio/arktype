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

type TypeDefinition<Root, Definition> = {
    [PropName in keyof Definition]:
        | ValidatedPropDef<keyof Root & string, Definition[PropName] & string>
        | Exact<
              Definition,
              TypeDefinition<Root, Definition[PropName] & (string | object)>
          >
}

export type TypeDefinitions<
    Definitions extends Record<string, string | object>
> = {
    [TypeName in keyof Definitions]: TypeDefinition<
        Definitions,
        Definitions[TypeName]
    >
}

type ParseTypeString<
    Definitions extends TypeDefinitions<Definitions>,
    PropDefinition extends string
> = PropDefinition extends OptionalPropDef<infer OptionalType>
    ? ParseTypeStringRecurse<Definitions, OptionalType> | undefined
    : ParseTypeStringRecurse<Definitions, PropDefinition>

type ParseTypeStringRecurse<
    Definitions extends TypeDefinitions<Definitions>,
    PropDefinition extends string
> = PropDefinition extends PropDefGroup<infer Group>
    ? ParseTypeStringRecurse<Definitions, Group>
    : PropDefinition extends ListPropDef<infer ListItem>
    ? ParseTypeStringRecurse<Definitions, ListItem>[]
    : PropDefinition extends OrPropDef<infer First, infer Second>
    ?
          | ParseTypeStringRecurse<Definitions, First>
          | ParseTypeStringRecurse<Definitions, Second>
    : PropDefinition extends keyof Definitions
    ? ParseType<Definitions, Definitions[PropDefinition]>
    : PropDefinition extends keyof PrimitiveTypes
    ? PrimitiveTypes[PropDefinition]
    : never

export type ParseTypes<Definitions extends TypeDefinitions<Definitions>> = {
    [TypeName in keyof Definitions]: ParseType<
        Definitions,
        Definitions[TypeName]
    >
}

export type ParseType<
    Definitions extends TypeDefinitions<Definitions>,
    Definition extends string | object
> = Definition extends string
    ? ParseTypeString<Definitions, Definition>
    : ParseTypeObject<Definitions, Definition>

type ParseTypeObject<
    Definitions extends TypeDefinitions<Definitions>,
    Definition
> = {
    [PropName in keyof ExcludeByValue<
        Definition & object,
        OptionalPropDef
    >]: ParseType<Definitions, Definition[PropName]>
} &
    {
        [PropName in keyof FilterByValue<
            Definition & object,
            OptionalPropDef
        >]?: Definition[PropName] extends OptionalPropDef<infer OptionalType>
            ? ParseType<Definitions, OptionalType>
            : never
    }

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
