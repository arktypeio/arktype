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
    TypeError,
    FilterByValue
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

type ModelConfig<
    Definitions,
    DefinedType extends string,
    Config
> = ModelConfigRecurse<Definitions, DefinedType, Config, false>

type ModelConfigRecurse<
    Definitions,
    DefinedType extends string,
    Config,
    InList extends boolean
> = Config extends TypeDefOnly<infer TypeDef>
    ? ValidatedPropDef<DefinedType, TypeDef>
    : Config extends TypedConfig<infer TypeDef>
    ? Exact<
          Config,
          TypedModelConfig<
              TransformCyclic<ParsePropType<Definitions, TypeDef>, number>,
              InList
          >
      >
    : TypeError<{
          message: `Model configs must either be a type string (e.g. 'string[]' or 'user?') or a config object with such a value as its 'type' property.`
          value: Config
      }>

type TypedModelConfig<T, InList extends boolean> = BaseModelConfigOptions<T> &
    (Unlisted<T> extends NonRecursible
        ? {}
        : RecursibleModelConfigOptions<T, InList>) &
    (InList extends false ? { idKey?: string } : {})

type BaseModelConfigOptions<T> = {
    type: {
        [K in keyof Unlisted<T>]?: ModelConfigRecurse<
            Unlisted<T>[K],
            T extends any[] ? true : false | InList
        >
    }
    validate?: (_: T) => boolean
    onChange?: (updates: T, original: T) => void
}

type RecursibleModelConfigOptions<T, InList extends boolean> = {}

type RootModelConfig<
    Definitions,
    DefinedType extends string,
    TypeDef extends string
> = {
    defines?: DefinedType
    type: ValidatedPropDef<DefinedType, TypeDef>
}

// /**
//  * TS sometimes fails to identify true | false as boolean without this.
//  * Unfortunately, this means we will mistake an explicitly typed true/false for a boolean,
//  * but the use case of those types in a state seems very niche.**/
// type ModelConfigType<T, InList extends boolean> = AsListIf<
//     T extends boolean ? boolean : T,
//     InList
// >

export const createStore = <
    Configs extends ModelConfigs<Configs>,
    A extends Actions<any> = {}
>(
    model: Narrow<Configs>,
    actions?: A
) => {
    return model as any
}

type TypeDefOnly<TypeDef extends string> = TypeDef

type TypedConfig<TypeDef extends string> = {
    type: TypeDef
}

type DefinedConfig<DefinedType extends string> = {
    defines: DefinedType
}

type ModeledTypes<Configs> = {
    [ModelPath in keyof Configs]: Configs[ModelPath] extends DefinedConfig<
        infer DefinedType
    >
        ? DefinedType
        : never
}[keyof Configs]

export type ModelConfigs<Configs> = {
    [ModelPath in keyof Configs]: ModelConfig<
        {},
        ModeledTypes<Configs>,
        Configs[ModelPath]
    >
}

const store = createStore({
    users: {
        defines: "user",
        type: {
            name: "string",
            friends: "user[]",
            bestFriend: "user",
            groups: {
                type: "group[]",
                onChange: (_) => {}
            }
        }
    },
    groups: {
        defines: "group",
        type: {
            description: "string",
            members: "user[]",
            admins: "user[]?",
            owner: "user",
            name: {
                type: "string",
                onChange: (_) => console.log(_)
            }
        }
    },
    snoozers: "user[]",
    currentUser: "user",
    preferences: {
        nicknames: "string[]",
        darkMode: {
            type: "boolean",
            validate: (_) => true,
            onChange: (_) => console.log(_)
        },
        defaultGroup: "group"
    }
})

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
