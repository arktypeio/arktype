import {
    Narrow,
    Exact,
    TypeError,
    NonRecursible,
    TransformCyclic,
    Unlisted
} from "@re-do/utils"
import { ParseType, ValidatedPropDef, DefinedTypeSet } from "./createTypes"

type TypeDefOnly<TypeDef extends string> = TypeDef

type TypedConfig<TypeDef extends string> = {
    type: TypeDef
}

type ModelConfig<T> = ModelConfigRecurse<T, false>

type RootModelConfig<Definitions, TypeDef extends string> = {
    type: TypeDef
} & ModelConfig<TransformCyclic<ParseType<Definitions, TypeDef>, number>>

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

export type ModelConfigs<Definitions, Configs> = {
    [ModelPath in keyof Configs]: Configs[ModelPath] extends TypeDefOnly<
        infer TypeDef
    >
        ? ValidatedPropDef<keyof Definitions & string, TypeDef>
        : Configs[ModelPath] extends TypedConfig<infer TypeDef>
        ? Exact<Configs[ModelPath], RootModelConfig<Definitions, TypeDef>>
        : TypeError<{
              message: `Model configs must either be a type string (e.g. 'string[]' or 'user?') or a config object with such a value as its 'type' property.`
              key: ModelPath
              value: Configs[ModelPath]
          }>
}

const createStore = <
    Definitions extends DefinedTypeSet<Definitions>,
    Config extends ModelConfigs<Definitions, Config>
>(
    definitions: Narrow<Definitions>,
    config: Narrow<Config>
) => {}

createStore(
    {
        user: {
            name: "string",
            bestFriend: "user",
            friends: "user[]",
            groups: "group[]",
            nested: {
                another: "string",
                user: "user[]"
            }
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
