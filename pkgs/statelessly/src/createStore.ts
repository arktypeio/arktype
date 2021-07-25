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
    AsListIf
} from "@re-do/utils"
import { O } from "ts-toolbelt"
import { Actions } from "./common.js"

export type Model<Input> = ModelRecurse<
    Input,
    Input,
    [],
    CyclicPathList<Input, { excludeArrayIndices: true; maxDepth: 8 }>,
    never,
    IsList<Input>
>

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
            maxDepth: 10
        }
    >,
    Join<CurrentPath>
>

type ModeledProperties<
    Root,
    Current,
    CurrentPath extends Segment[],
    MandatoryPaths extends Segment[],
    Seen
> = O.Required<
    {
        [K in Extract<keyof Current, Segment>]?: ModelRecurse<
            Root,
            Unlisted<Current[K]>,
            [...CurrentPath, K],
            MandatoryPaths,
            Seen | Current,
            IsList<Current[K]>
        >
    },
    MandatoryKeys<Current, CurrentPath, MandatoryPaths>
>

type MandatoryKeys<
    Current,
    CurrentPath extends Segment[],
    MandatoryPaths extends Segment[]
> = Extract<
    {
        [K in keyof Current]: [...CurrentPath, K] extends MandatoryPaths
            ? K
            : never
    }[keyof Current],
    Segment
>

type ModelValue<
    Root,
    Current,
    CurrentPath extends Segment[],
    MandatoryPaths extends Segment[],
    Seen
> =
    | AvailableReferencePath<Root, Current, CurrentPath>
    | (Current extends Seen
          ? never
          : ModeledProperties<Root, Current, CurrentPath, MandatoryPaths, Seen>)

type ModelRecurse<
    Root,
    Current,
    CurrentPath extends Segment[],
    MandatoryPaths extends Segment[],
    Seen,
    InArray extends boolean
> = Current extends NonRecursible
    ? ModelConfig<Current, InArray>
    : WithOptionalTuple<
          ModelValue<Root, Current, CurrentPath, MandatoryPaths, Seen>,
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

export const createStore = <
    Input extends object,
    M extends Model<Input>,
    A extends Actions<Input>
>({
    initial,
    model,
    actions
}: CreateStoreOptions<Input, M, A>) => "" as Store<Input, M, A>

const x = createStore({
    initial: {} as any as Test,
    model: [
        {
            users: {
                groups: ["groups", { onChange: () => {} }],
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
        {}
    ]
})

export type Store<
    Input extends object,
    M extends Model<Input>,
    A extends Actions<Input>
> = StoreRecurse<Input, Input, IsList<Input>, never, M>

type StoreRecurse<
    Root extends object,
    Current,
    InArray extends boolean,
    Seen,
    M
    // M extends ModelRecurse<Current, Current, CurrentPath, InArray, Seen>
> = Current extends NonRecursible
    ? Current
    : {
          [K in keyof Current]: M extends WithOptionalTuple<
              infer Value,
              infer Config
          >
              ? K extends keyof Value
                  ? Value[K] extends string
                      ? `Reference to ${Extract<Value[K], string>}`
                      : StoreRecurse<
                            Root,
                            Unlisted<Current[K]>,
                            IsList<Current[K]>,
                            Seen | Current,
                            Value[K]
                        >
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
