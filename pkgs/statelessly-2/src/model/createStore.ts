import {
    NonRecursible,
    Unlisted,
    Segment,
    IsList,
    AsListIf,
    Narrow,
    KeyValuate,
    ExcludeCyclic,
    Exact,
    TransformCyclic,
    TypeError
} from "@re-do/utils"
import { Actions, Interactions } from "./common.js"
import {
    ParsePropType,
    TypeDefinitions,
    ValidatedPropDef
} from "./createTypes.js"

// export type Model<Input, Types> = ModelRecurse<
//     Input,
//     [],
//     never,
//     Input,
//     Types,
//     IsList<Input>
// >

// type WithOptionalTuple<T, Optional> = T | [T] | [T, Optional]

// type ModeledProperties<
//     Current,
//     CurrentPath extends Segment[],
//     Seen,
//     Root,
//     Types
// > = {
//     [K in Extract<keyof Current, Segment>]?: ModelRecurse<
//         Unlisted<Current[K]>,
//         [...CurrentPath, K],
//         Seen | Current,
//         Root,
//         Types,
//         IsList<Current[K]>
//     >
// }

// type ModelValue<Current, CurrentPath extends Segment[], Seen, Root, Types> =
//     | keyof Types
//     | (Current extends Seen
//           ? never
//           : ModeledProperties<Current, CurrentPath, Seen, Root, Types>)

// type ModelRecurse<
//     Current,
//     CurrentPath extends Segment[],
//     Seen,
//     Root,
//     Types,
//     InList extends boolean
// > = Current extends NonRecursible
//     ? ModelConfig<Current, InList>
//     : WithOptionalTuple<
//           ModelValue<Current, CurrentPath, Seen, Root, Types>,
//           ModelConfig<Current, InList>
//       >

type ModelConfig<T> = ModelConfigRecurse<T, false>

type ModelConfigRecurse<T, InList extends boolean> = BaseModelConfigOptions<T> &
    (Unlisted<T> extends NonRecursible
        ? {}
        : RecursibleModelConfigOptions<T, InList>) &
    (InList extends false ? { idKey?: string } : {})

type BaseModelConfigOptions<T> = {
    validate?: (_: T) => boolean
    onChange?: (updates: T, original: T) => void
}

type RecursibleModelConfigOptions<T, InList extends boolean> = {
    fields?: {
        [K in keyof Unlisted<T>]?: ModelConfigRecurse<
            Unlisted<T>[K],
            T extends any[] ? true : false | InList
        >
    }
    references?: string
}

type RootModelConfig<Definitions, TypeDef extends string> = {
    type: ValidatedPropDef<Definitions, TypeDef>
} & ModelConfig<TransformCyclic<ParsePropType<Definitions, TypeDef>, number>>

// /**
//  * TS sometimes fails to identify true | false as boolean without this.
//  * Unfortunately, this means we will mistake an explicitly typed true/false for a boolean,
//  * but the use case of those types in a state seems very niche.**/
// type ModelConfigType<T, InList extends boolean> = AsListIf<
//     T extends boolean ? boolean : T,
//     InList
// >

export const createStore = <
    Configs extends ModelConfigs<Definitions, Configs>,
    Definitions extends TypeDefinitions<Definitions> = {},
    A extends Actions<any> = {}
>(
    model: Narrow<Configs>,
    types?: Narrow<Definitions>,
    actions?: A
) => {
    return model as any
}

type TypeDefOnly<TypeDef extends string> = TypeDef

type TypedConfig<TypeDef extends string> = {
    type: TypeDef
}

export type ModelConfigs<Definitions, Configs> = {
    [ModelPath in keyof Configs]: Configs[ModelPath] extends TypeDefOnly<
        infer TypeDef
    >
        ? ValidatedPropDef<Definitions, TypeDef>
        : Configs[ModelPath] extends TypedConfig<infer TypeDef>
        ? Exact<Configs[ModelPath], RootModelConfig<Definitions, TypeDef>>
        : TypeError<{
              message: `Model configs must either be a type string (e.g. 'string[]' or 'user?') or a config object with such a value as its 'type' property.`
              key: ModelPath
              value: Configs[ModelPath]
          }>
}

const getModelDefs = <
    Definitions extends TypeDefinitions<Definitions>,
    Config extends ModelConfigs<Definitions, Config>
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
        users: "user[]",
        groups: {
            type: "group[]",
            idKey: "",
            fields: {
                name: {
                    onChange: (_) => console.log(_)
                },
                members: {
                    onChange: (updated, original) => {},
                    fields: {
                        groups: {}
                    }
                }
            },
            onChange: (groups) =>
                console.log(groups.map((_) => _.name).join(","))
        }
    }
)

const store = createStore(
    {
        snoozers: "user[]",
        currentUser: "user",
        users: {
            type: "user[]",
            fields: {
                groups: { onChange: (_) => {} }
            }
        },
        groups: {
            type: "group[]",
            fields: {
                name: {
                    onChange: (_) => console.log(_)
                }
            }
        },
        preferences: {
            type: "preferences",
            fields: {
                nicknames: {},
                darkMode: {
                    validate: (_) => true,
                    onChange: (_) => console.log(_)
                }
            }
        }
    },
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
        },
        preferences: {
            nicknames: "string[]",
            darkMode: "boolean"
        }
    }
)

store.currentUser.bestFriend

// export type Store<
//     Input extends object,
//     M extends Model<Input, T>,
//     T extends TypeDefinitions<T>,
//     A extends Actions<Input>
// > = StoreRecurse<Input, M, IsList<Input>, "id">

// type StoreRecurse<
//     Input,
//     Model,
//     InList extends boolean,
//     IdKey extends string
// > = Input extends NonRecursible
//     ? Model extends ModelConfig<any>
//         ? Input
//         : Input
//     : Input extends any[]
//     ? StoreRecurse<Unlisted<Input>, Model, true, IdKey>
//     : {
//           [K in keyof Input]: Model extends WithOptionalTuple<
//               infer ModelProps,
//               infer ModelConfig
//           >
//               ? K extends keyof ModelProps
//                   ? ModelProps[K] extends string
//                       ? Input[K] extends any[]
//                           ? Interactions<
//                                 Extract<Unlisted<Input[K]>, object>,
//                                 Extract<
//                                     KeyValuate<ModelConfig, "idKey", IdKey>,
//                                     string
//                                 >
//                             >
//                           : Operations<Input[K]>
//                       : Input[K] extends any[]
//                       ? Interactions<
//                             Extract<Unlisted<Input[K]>, object>,
//                             Extract<
//                                 KeyValuate<ModelConfig, "idKey", IdKey>,
//                                 string
//                             >
//                         >
//                       : StoreRecurse<
//                             Input[K],
//                             ModelProps[K],
//                             false,
//                             Extract<
//                                 KeyValuate<ModelConfig, "idKey", IdKey>,
//                                 string
//                             >
//                         >
//                   : // No config provided
//                     Operations<Input[K]>
//               : Operations<Input[K]>
//       }

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
