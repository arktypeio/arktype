import { DeepUnlisted, NonCyclic, Paths, ValueAtPath } from "@re-do/utils"
import { Actions } from "./common.js"
import { Model } from "./model/model.js"

export type SuperModel<Input extends object> = {
    [Path in Paths<NonCyclic<Input, number>>]?: PathConfig<Input, Path>
}

// export type Model<Input extends object> = {
//     [K in CandidateModelPaths<Input>]?: {
//         [K2 in keyof FilterByValue<
//             Unlisted<ValueAtPath<Input, K>>,
//             object
//         >]: Unlisted<ValueAtPath<Input, K>>[K2] extends NonRecursible
//             ? never
//             : CandidateModelPaths<Input>
//     }
// } & { _meta?: ModelMetaOptions<any> }

const x: SuperModel<Root> = {
    users: [
        {
            name: "",
            friends: [],
            groups: [{ name: "", description: "", users: [] }]
        }
    ]
}

// type F = SuperModel<Root>

export type PathConfig<
    Input extends object,
    Path extends Paths<NonCyclic<Input>>
> = ValueAtPath<Input, Path> extends object[] ? {} : {}

export type CreateStoreOptions<Input extends object> = {
    model?: Model<Input>
    actions?: Actions<Input>
}

export const createStore = <Input extends object>(
    model: SuperModel<Input>
) => {}

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

type Root = typeof fallback
