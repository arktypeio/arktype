import {
    NonRecursible,
    Unlisted,
    Join,
    Segment,
    PathTo,
    IsList,
    AsListIf,
    Narrow,
    KeyValuate,
    TypeError,
    Or,
    Split
} from "@re-do/utils"
import { List } from "ts-toolbelt"
import { Actions, Interactions } from "./common.js"

export type Model<Input, Types> = ModelRecurse<
    Input,
    [],
    never,
    Input,
    Types,
    IsList<Input>
>

type WithOptionalTuple<T, Optional> = T | [T] | [T, Optional]

type ModeledProperties<
    Current,
    CurrentPath extends Segment[],
    Seen,
    Root,
    Types
> = {
    [K in Extract<keyof Current, Segment>]?: ModelRecurse<
        Unlisted<Current[K]>,
        [...CurrentPath, K],
        Seen | Current,
        Root,
        Types,
        IsList<Current[K]>
    >
}

type ModelValue<Current, CurrentPath extends Segment[], Seen, Root, Types> =
    | keyof (PrimitiveTypes & Types)
    | (Current extends Seen
          ? never
          : ModeledProperties<Current, CurrentPath, Seen, Root, Types>)

type ModelRecurse<
    Current,
    CurrentPath extends Segment[],
    Seen,
    Root,
    Types,
    InList extends boolean
> = Current extends NonRecursible
    ? ModelConfig<Current, InList>
    : WithOptionalTuple<
          ModelValue<Current, CurrentPath, Seen, Root, Types>,
          ModelConfig<Current, InList>
      >

export type ModelConfig<T, InList extends boolean = false> = InList extends true
    ? ListModelConfigOptions<ModelConfigType<T, InList>>
    : BaseModelConfigOptions<ModelConfigType<T, InList>>

type BaseModelConfigOptions<T> = {
    idKey?: string
    validate?: (_: T) => boolean
    onChange?: (_: T) => void
}

type ListModelConfigOptions<T> = BaseModelConfigOptions<T> & {
    defines?: string
}

/**
 * TS sometimes fails to identify true | false as boolean without this.
 * Unfortunately, this means we will mistake an explicitly typed true/false for a boolean,
 * but the use case of those types in a state seems very niche.**/
type ModelConfigType<T, InList extends boolean> = AsListIf<
    T extends boolean ? boolean : T,
    InList
>

type PrimitiveTypes = {
    string: string
    boolean: boolean
    number: number
}

type BasePropDef<T> = string & keyof (PrimitiveTypes & T)

type ListPropDef<ListItem extends string = string> = `${ListItem}[]`

type OrPropDef<
    First extends string = string,
    Second extends string = string
> = `${First} | ${Second}`

type OptionalPropDef<OptionalType extends string = string> = {}

type ValidatedPropDef<
    Root,
    Current extends string
> = Current extends ListPropDef<infer ListItem>
    ? `${ValidatedPropDef<Root, ListItem>}[]`
    : Current extends OrPropDef<infer First, infer Second>
    ? `${ValidatedPropDef<Root, First>} | ${ValidatedPropDef<Root, Second>}`
    : Current extends BasePropDef<Root>
    ? Current
    : `Unable to determine the type of '${Current}'.`

type TypeDefinition<Root, TypeName extends keyof Root> = {
    [PropName in keyof Root[TypeName]]: ValidatedPropDef<
        Root,
        Root[TypeName][PropName]
    >
}

type TypeDefinitions<Root> = {
    [TypeName in keyof Root]: TypeDefinition<Root, TypeName>
}

type ParsePropType<
    Definitions extends TypeDefinitions<Definitions>,
    Definition extends string
> = Definition extends ListPropDef<infer ListItem>
    ? ParsePropType<Definitions, ListItem>[]
    : Definition extends OrPropDef<infer First, infer Second>
    ? ParsePropType<Definitions, First> | ParsePropType<Definitions, Second>
    : Definition extends keyof Definitions
    ? GetType<Definitions, Definition>
    : Definition extends keyof PrimitiveTypes
    ? PrimitiveTypes[Definition]
    : never

type GetTypes<Definitions extends TypeDefinitions<Definitions>> = {
    [TypeName in keyof Definitions]: GetType<Definitions, TypeName>
}

type GetType<T extends TypeDefinitions<T>, Name extends keyof T> = {
    [K in keyof T[Name]]: ParsePropType<T, T[Name][K]>
}

const getType = <T extends TypeDefinitions<T>, Name extends keyof T>(
    t: Narrow<T>,
    name: Name
) => "" as any as GetType<T, Name>
//as GetType < T, Name >

const x = getType(
    {
        user: {
            name: "string",
            male: "boolean | string | number",
            bestFriend: "user",
            friends: "user[]"
        }
    },
    "user"
)

type F = typeof x

export const createStore = <
    Input extends object,
    M extends Model<Input, T>,
    T extends TypeDefinitions<T> = {},
    A extends Actions<Input> = {}
>(
    initial: Input,
    model?: Narrow<M>,
    types?: Narrow<T>,
    actions?: A
) => {
    return model as any as Store<Input, M, T, A>
}

const store = createStore(
    {} as any as Test,
    [
        {
            snoozers: "user",
            currentUser: "user",
            users: {
                groups: ["group", { onChange: (_) => {} }],
                friends: "user"
            },
            groups: [
                {
                    name: {
                        onChange: (_) => console.log(_)
                    },
                    description: {},
                    members: "user",
                    owner: "user"
                },
                { idKey: "croop" }
            ],
            preferences: {
                nicknames: {},
                darkMode: {
                    validate: (_) => true,
                    onChange: (_) => console.log(_)
                }
            }
        },
        {
            idKey: "foop",
            validate: (_) => true
        }
    ],
    {
        user: {
            name: "string",
            friends: "user[]",
            bestFriend: "user",
            groups: "group[]"
        },
        group: {
            name: "string",
            description: "string",
            members: "user[]",
            owner: "user"
        }
    }
)

const fallback = {
    users: [] as User[],
    groups: [] as Group[],
    snoozers: [] as User[],
    currentUser: null as null | User,
    preferences: {
        darkMode: false,
        nicknames: [] as string[]
    }
}

store.currentUser.bestFriend

export type Store<
    Input extends object,
    M extends Model<Input, T>,
    T extends TypeDefinitions<T>,
    A extends Actions<Input>
> = StoreRecurse<Input, M, IsList<Input>, "id">

type StoreRecurse<
    Input,
    Model,
    InList extends boolean,
    IdKey extends string
> = Input extends NonRecursible
    ? Model extends ModelConfig<any>
        ? Input
        : Input
    : Input extends any[]
    ? StoreRecurse<Unlisted<Input>, Model, true, IdKey>
    : {
          [K in keyof Input]: Model extends WithOptionalTuple<
              infer ModelProps,
              infer ModelConfig
          >
              ? K extends keyof ModelProps
                  ? ModelProps[K] extends string
                      ? Input[K] extends any[]
                          ? Interactions<
                                Extract<Unlisted<Input[K]>, object>,
                                Extract<
                                    KeyValuate<ModelConfig, "idKey", IdKey>,
                                    string
                                >
                            >
                          : Operations<Input[K]>
                      : Input[K] extends any[]
                      ? Interactions<
                            Extract<Unlisted<Input[K]>, object>,
                            Extract<
                                KeyValuate<ModelConfig, "idKey", IdKey>,
                                string
                            >
                        >
                      : StoreRecurse<
                            Input[K],
                            ModelProps[K],
                            false,
                            Extract<
                                KeyValuate<ModelConfig, "idKey", IdKey>,
                                string
                            >
                        >
                  : // No config provided
                    Operations<Input[K]>
              : Operations<Input[K]>
      }

type Operations<T> = T & {
    get: () => T
    set: (value: T) => void
}

type User = {
    name: string
    friends: User[]
    groups: Group[]
    bestFriend: User
}

type Group = {
    name: string
    description: string
    members: User[]
    owner: User
}

const fallback = {
    users: [] as User[],
    groups: [] as Group[],
    snoozers: [] as User[],
    currentUser: null as null | User,
    preferences: {
        darkMode: false,
        nicknames: [] as string[]
    }
}

type Test = typeof fallback
