import {
    ExcludeByValue,
    FilterByValue,
    KeyValuate,
    LimitDepth,
    Narrow,
    NonCyclic
} from "@re-do/utils"

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

type PropDefGroup<Group extends string = string> = `(${Group})`

type OptionalPropDef<OptionalType extends string = string> = `${OptionalType}?`

type ReferencePropDef<ReferencedType extends string = string> =
    `@${ReferencedType}`

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

export type ParsePropType<
    Definitions extends TypeDefinitions<Definitions>,
    PropDefinition extends string
> = PropDefinition extends PropDefGroup<infer Group>
    ? ParsePropType<Definitions, Group>
    : PropDefinition extends OptionalPropDef<infer OptionalType>
    ? ParsePropType<Definitions, OptionalType> | undefined
    : PropDefinition extends ListPropDef<infer ListItem>
    ? ParsePropType<Definitions, ListItem>[]
    : PropDefinition extends OrPropDef<infer First, infer Second>
    ? ParsePropType<Definitions, First> | ParsePropType<Definitions, Second>
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

type TestTypes = {
    user: {
        name: "string"
        bestFriend: "user"
        friends: "user[]"
        groups: "group[]"
    }
    group: {
        name: "string"
        description: "string?"
        members: "user[]"
        owner: "user"
    }
}

const types: TestTypes = {
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
}

const x = getTypes(types)

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

const getModelDefs = <Def extends ModelDefinitions<TestTypes, Def>>(
    def: Narrow<Def>
) => ({} as any as Def)

getModelDefs({
    users: {
        type: "user",
        validate: (u) => {
            return true
        }
    }
})
