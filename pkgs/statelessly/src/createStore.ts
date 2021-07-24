import {
    DeepUnlisted,
    NonCyclic,
    NonRecursible,
    PathOf,
    Unlisted,
    LeafOf,
    ValueAtPath,
    Join,
    Segment,
    PathTo,
    AsListIfList
} from "@re-do/utils"
import { Actions } from "./common.js"

export type Model<Input extends object> = ModelRecurse<
    Input,
    Input,
    [],
    false,
    never
>

type AsListIf<T, Condition extends boolean> = Condition extends true ? T[] : T
type IfList<T, IfList, IfNotList> = T extends any[] ? IfList : IfNotList
type IsList<T> = IfList<T, true, false>

type WithOptionalTuple<T, Optional> = Readonly<T | [T] | [T, Optional]>

type AvailableReferencePaths<
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
    readonly [K in Extract<keyof Current, Segment>]?: ModelRecurse<
        Root,
        Unlisted<Current[K]>,
        [...CurrentPath, K],
        IsList<Current[K]>,
        Seen | Current
    >
}

type ModelValue<Root, Current, CurrentPath extends Segment[], Seen> =
    | AvailableReferencePaths<Root, Current, CurrentPath>
    | (Current extends Seen
          ? never
          : ModeledProperties<Root, Current, CurrentPath, Seen>)

type ModelRecurse<
    Root,
    Current,
    CurrentPath extends Segment[],
    InArray extends boolean,
    Seen
> = Current extends NonRecursible
    ? ModelConfig<Current, InArray>
    : WithOptionalTuple<
          ModelValue<Root, Current, CurrentPath, Seen>,
          ModelConfig<Current, InArray, CurrentPath extends [] ? true : false>
      >

export type ModelConfig<
    T,
    InArray extends boolean = false,
    IsRootConfig extends boolean = false
> = IsRootConfig extends true
    ? RootModelConfig<ModelConfigType<T, InArray>>
    : BaseModelConfig<ModelConfigType<T, InArray>>

type BaseModelConfig<T> = {
    validate?: (_: T) => boolean
    onChange?: (_: T) => void
}

type RootModelConfig<T> = BaseModelConfig<T> & {
    idKey?: string
}

/**
 * TS sometimes fails to identify true | false as boolean without this.
 * Unfortunately, this means we will mistake an explicitly typed true/false for a boolean,
 * but the use case of those types in a state seems very niche.**/
type ModelConfigType<T, InArray extends boolean> = AsListIf<
    T extends boolean ? boolean : T,
    InArray
>

export type CreateStoreOptions<
    Input extends object,
    M extends Model<Input>,
    A extends Actions<Input>
> = {
    initial: Input
    model?: M
    actions?: A
}

export type Store<
    Input extends object,
    M extends Model<Input>,
    A extends Actions<Input>
> = M extends readonly [infer Value, infer Config] ? Value : false

//     {
//     [K in keyof Input]: M extends WithOptionalTuple<infer Value, infer Config>
//         ? K extends keyof Value
//             ? Value[K]
//             : never
//         : never
// }

export const createStore = <
    Input extends object,
    M extends Model<Input>,
    A extends Actions<Input>
>(
    initial: Input,
    model?: M,
    actions?: A
): Store<Input, M, A> => "" as any

const x = createStore(
    {} as any as Test,
    [
        {
            users: {
                groups: ["groups", { onChange: () => {} }]
            },
            groups: [
                {
                    name: {
                        onChange: (_) => console.log(_)
                    },
                    description: {},
                    users: {
                        friends: "users"
                    }
                }
            ],
            preferences: {
                nicknames: {},
                darkMode: {
                    validate: (_) => true,
                    onChange: (_) => console.log(_)
                }
            }
        },
        {}
    ] as const
)

type User = {
    name: string
    friends: User[]
    groups: Group[]
}

type Group = {
    name: string
    description: string
    users: User[]
}

const fallback = {
    users: [] as User[],
    groups: [] as Group[],
    currentUser: "",
    preferences: {
        darkMode: false,
        nicknames: [] as string[]
    }
}

type Test = typeof fallback
