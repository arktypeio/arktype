import {
    NonRecursible,
    Unlisted,
    Join,
    Segment,
    PathTo,
    IsList,
    AsListIf,
    Narrow,
    KeyValuate
} from "@re-do/utils"
import { Actions, Interactions } from "./common.js"

export type Model<Input> = ModelRecurse<Input, Input, [], never, IsList<Input>>

type WithOptionalTuple<T, Optional> = T | [T] | [T, Optional]

type AvailableReferencePath<
    Root,
    Current,
    CurrentPath extends Segment[]
> = Exclude<
    PathTo<
        Root,
        Current[],
        {
            excludeArrayIndices: true
        }
    >,
    Join<CurrentPath>
>

type ModeledProperties<Root, Current, CurrentPath extends Segment[], Seen> = {
    [K in Extract<keyof Current, Segment>]?: ModelRecurse<
        Root,
        Unlisted<Current[K]>,
        [...CurrentPath, K],
        Seen | Current,
        IsList<Current[K]>
    >
}

type ModelValue<Root, Current, CurrentPath extends Segment[], Seen> =
    | AvailableReferencePath<Root, Current, CurrentPath>
    | (Current extends Seen
          ? never
          : ModeledProperties<Root, Current, CurrentPath, Seen>)

type ModelRecurse<
    Root,
    Current,
    CurrentPath extends Segment[],
    Seen,
    InList extends boolean
> = Current extends NonRecursible
    ? ModelConfig<Current, InList>
    : WithOptionalTuple<
          ModelValue<Root, Current, CurrentPath, Seen>,
          ModelConfig<Current, InList>
      >

export type ModelConfig<T, InList extends boolean = false> = ModelConfigOptions<
    ModelConfigType<T, InList>
>

type ModelConfigOptions<T> = {
    idKey?: string
    validate?: (_: T) => boolean
    onChange?: (_: T) => void
}

/**
 * TS sometimes fails to identify true | false as boolean without this.
 * Unfortunately, this means we will mistake an explicitly typed true/false for a boolean,
 * but the use case of those types in a state seems very niche.**/
type ModelConfigType<T, InList extends boolean> = AsListIf<
    T extends boolean ? boolean : T,
    InList
>

export const createStore = <
    Input extends object,
    M extends Model<Input>,
    A extends Actions<Input>
>(
    initial: Input,
    model?: Narrow<M>,
    actions?: A
) => {
    return model as any as Store<Input, M, A>
}

const store = createStore({} as any as Test, [
    {
        snoozers: "users",
        users: {
            groups: ["groups", { onChange: (_) => {} }],
            friends: "users"
        },
        groups: [
            {
                name: {
                    onChange: (_) => console.log(_)
                },
                description: {},
                members: "users",
                owner: "users"
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
]).groups.owner

export type Store<
    Input extends object,
    M extends Model<Input>,
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
                          : `Single reference to ${Extract<
                                ModelProps[K],
                                string
                            >}`
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
                    "no config"
              : "cant infer value"
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
    currentUser: "",
    preferences: {
        darkMode: false,
        nicknames: [] as string[]
    }
}

type Test = typeof fallback
