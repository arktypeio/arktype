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
    AsListIfList,
    PathListOf,
    valueAtPath,
    CyclicPathList,
    IsList,
    AsListIf,
    PathListFromLeafList,
    FilterByValue,
    ExcludeByValue
} from "@re-do/utils"
import { Actions } from "./common.js"

export type Model<Input> = ModelRecurse<Input, Input, [], never, IsList<Input>>

type WithOptionalTuple<T, Optional> = T | Readonly<[T] | [T, Optional]>

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
    InArray extends boolean
> = Current extends NonRecursible
    ? Readonly<ModelConfig<Current, InArray>>
    : WithOptionalTuple<
          Readonly<ModelValue<Root, Current, CurrentPath, Seen>>,
          Readonly<
              ModelConfig<
                  Current,
                  InArray,
                  CurrentPath extends [] ? true : false
              >
          >
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

export const createStore = <
    Input extends object,
    M extends Model<Input>,
    A extends Actions<Input>
>(
    initial: Input,
    model?: M,
    actions?: A
) => "" as Store<Input, M, A>

const x = createStore(
    {} as any as Test,
    [
        {
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
                    users: "users"
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
        {
            validate: (_) => true
        }
    ] as const
)

export type Store<
    Input extends object,
    M extends Model<Input>,
    A extends Actions<Input>
> = StoreRecurse<Input, Input, never, M>

type StoreRecurse<
    Root extends object,
    Current,
    Seen,
    M
> = Current extends NonRecursible
    ? Current
    : Current extends any[]
    ? StoreRecurse<Root, Unlisted<Current>, Seen, M>[]
    : {
          [K in keyof Current]: M extends WithOptionalTuple<
              infer Value,
              infer Config
          >
              ? K extends keyof Value
                  ? Value[K] extends string
                      ? `Reference to ${Extract<Value[K], string>}`
                      : StoreRecurse<Root, Current[K], Seen | Current, Value[K]>
                  : // No config provided
                    Current[K]
              : Current[K]
      }

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
