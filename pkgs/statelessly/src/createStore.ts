import {
    DeepUnlisted,
    NonCyclic,
    NonRecursible,
    PathOf,
    Unlisted,
    LeafOf,
    ValueAtPath,
    Join,
    Segment
} from "@re-do/utils"
import { Actions } from "./common.js"

export type OnCycle = "__cycle__"

export type Model<Input extends object> = ModelRecurse<
    NonCyclic<Input, OnCycle>,
    NonCyclic<Input, OnCycle>,
    []
>

export type CandidateEntityPath<Input extends object> = LeafOf<
    Input,
    { filter: object[]; treatAsLeaf: object[] }
>

type ModelRecurse<
    Root,
    Current,
    CurrentPath extends Segment[]
> = Current extends NonRecursible
    ? ModelConfig<Current>
    :
          | Exclude<
                LeafOf<
                    Root,
                    {
                        filter: Unlisted<Current>[]
                        treatAsLeaf: Unlisted<Current>[]
                        excludeArrayIndices: true
                    }
                >,
                Join<CurrentPath>
            >
          | {
                [K in Extract<keyof Current, Segment>]?:
                    | ModelRecurse<
                          Root,
                          Unlisted<Current[K]>,
                          [...CurrentPath, K]
                      >
                    | [
                          ModelRecurse<
                              Root,
                              Unlisted<Current[K]>,
                              [...CurrentPath, K]
                          >,
                          ModelConfig<Current[K]>
                      ]
            }

const x: Model<Test> = {
    users: {
        groups: {
            name: {
                onChange: (_) => console.log(_)
            },
            description: {},
            users: {}
        }
    }
}

type X = LeafOf<
    Test,
    {
        filter: Group[]
        treatAsLeaf: Group[]
    }
>

export type ModelConfig<T> = {
    validate?: (_: T) => boolean
    onChange?: (_: T) => void
}

export type CreateStoreOptions<Input extends object> = {
    model?: Model<Input>
    actions?: Actions<Input>
}

export const createStore = <Input extends object>(model: Model<Input>) => {}

// const store = createStore<Root>({})

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
