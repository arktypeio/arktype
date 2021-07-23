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
    PathTo
} from "@re-do/utils"
import { Actions } from "./common.js"

export type Model<Input extends object> = ModelRecurse<Input, Input, []>

type WithOptionalTuple<T, O> = T | [T, O]

type ModelRecurse<
    Root,
    Current,
    CurrentPath extends Segment[]
> = Current extends NonRecursible
    ? ModelConfig<Current>
    : WithOptionalTuple<
          | Exclude<
                PathTo<
                    Root,
                    Current[],
                    {
                        excludeArrayIndices: true
                    }
                >,
                Join<CurrentPath>
            >
          | {
                [K in Extract<keyof Current, Segment>]?: ModelRecurse<
                    Root,
                    Unlisted<Current[K]>,
                    [...CurrentPath, K]
                >
            },
          ModelConfig<Current>
      >

const x: Model<Test> = {
    users: {
        groups: ["groups", { onChange: () => {} }]
    },
    groups: {
        name: {
            onChange: (_) => console.log(_)
        },
        description: {},
        users: {}
    }
}

export type ModelConfig<T> = {
    validate?: (_: T) => boolean
    onChange?: (_: T) => void
}

export type CreateStoreOptions<Input extends object> = {
    model?: Model<Input>
    actions?: Actions<Input>
}

export const createStore = <Input extends object>(model: Model<Input>) => {}

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
