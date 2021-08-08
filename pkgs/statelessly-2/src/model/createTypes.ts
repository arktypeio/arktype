import {
    ExcludeByValue,
    FilterByValue,
    KeyValuate,
    LimitDepth,
    Narrow,
    NonCyclic,
    WithOptionalValues
} from "@re-do/utils"

type PrimitiveTypes = {
    string: string
    boolean: boolean
    number: number
    null: null
}

type PrimitivePropDef = string & keyof PrimitiveTypes

type DefinedPropDef<T> = string & keyof T

type AtomicPropDef<T> = DefinedPropDef<T> | PrimitivePropDef

type ListPropDef<ListItem extends string = string> = `${ListItem}[]`

type OrPropDef<
    First extends string = string,
    Second extends string = string
> = `${First} | ${Second}`

type PropDefGroup<Group extends string = string> = `(${Group})`

type OptionalPropDef<OptionalType extends string = string> = `${OptionalType}?`

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
    : Fragment extends AtomicPropDef<Definitions>
    ? Fragment
    : `Unable to determine the type of '${Fragment}'.`

// type ValidatedReferencePropDefRecurse<
//     Definitions,
//     Fragment extends string
// > = Fragment extends OptionalPropDef<infer OptionalType>
//     ? OptionalType extends DefinedPropDef<Definitions>
//         ? Fragment
//         : `${DefinedPropDef<Definitions>}?`
//     : Fragment extends ListPropDef<infer ListItem>
//     ? ListItem extends DefinedPropDef<Definitions>
//         ? Fragment
//         : `${DefinedPropDef<Definitions>}[]`
//     : Fragment extends DefinedPropDef<Definitions>
//     ? Fragment
//     : DefinedPropDef<Definitions>

type ValidatedMetaPropDef<
    Definitions,
    PropDef extends string
> = PropDef extends OptionalPropDef<infer OptionalType>
    ? `${ValidatedPropDefRecurse<Definitions, OptionalType>}?`
    : ValidatedPropDefRecurse<Definitions, PropDef>

export type ValidatedPropDef<
    Definitions,
    PropDef extends string
> = ValidatedMetaPropDef<Definitions, PropDef>

type TypeDefinition<Root, TypeName extends keyof Root> = {
    [PropName in keyof Root[TypeName]]: ValidatedPropDef<
        Root,
        Root[TypeName][PropName]
    >
}

export type TypeDefinitions<Root> = {
    [TypeName in keyof Root]: TypeDefinition<Root, TypeName>
}

export type ParsePropType<
    Definitions extends TypeDefinitions<Definitions>,
    PropDefinition extends string
> = ParseMetaPropType<Definitions, PropDefinition>

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

const getType = <T extends TypeDefinitions<T>, Name extends keyof T>(
    t: Narrow<T>,
    name: Name
) => "" as any as ParseType<T, Name>

const getTypes = <T extends TypeDefinitions<T>>(t: Narrow<T>) =>
    "" as any as ParseTypes<T>

getTypes({
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
}).group.owner

type ModelConfig<
    Types,
    Type extends string,
    T = NonCyclic<ParsePropType<Types, Type>>
> = {
    type: ValidatedPropDef<Types, Type>
    idKey?: string
    initial?: T
    validate?: (_: T) => boolean
    onChange?: (_: T) => void
}

export type ModelDefinitions<
    Types,
    Root extends Record<string, ModelConfig<Types, any>>
> = {
    [K in keyof Root]: ModelConfig<Types, Root[K]["type"]>
}

const getModelDefs = <
    T,
    Definitions extends TypeDefinitions<T>,
    Config extends ModelDefinitions<Definitions, Config>
>(
    definitions: Narrow<Definitions>,
    config: Narrow<Config>
) => ({} as any as Config)

getModelDefs(
    {
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
    },
    {
        users: {
            type: "user",
            validate: (u) => {
                return true
            }
        }
    }
)
