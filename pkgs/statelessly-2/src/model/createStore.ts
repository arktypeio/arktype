import {
    Narrow,
    Exact,
    TypeError,
    NonRecursible,
    Unlisted,
    KeyValuate
} from "@re-do/utils"
import { ParseType, ValidatedPropDef, TypeDefinition } from "./createTypes"
import { Object as ToolbeltObject } from "ts-toolbelt"

type TypeDefOnly<TypeDef extends string> = TypeDef

type ConfigWithType<TypeDef extends string> = {
    type: TypeDef
}

type ConfigWithFields<Fields extends object> = {
    fields: Fields
}

type RootModelConfig<Config, TypeSet> = ModelConfigRecurse<
    ParseType<TypeSet, UpfilterTypes<Config>>,
    Config,
    false,
    false,
    never,
    TypeSet
>

export type ModelConfigRecurse<
    T,
    Config,
    IsTyped extends boolean,
    InList extends boolean,
    Seen,
    TypeSet
> = Config extends TypeDefOnly<infer TypeDef>
    ? ValidatedPropDef<keyof TypeSet & string, TypeDef>
    : Config extends ConfigWithType<string>
    ? Exact<
          Config,
          ModelConfigOptions<T, Config, IsTyped, InList, Seen, TypeSet>
      >
    : Config extends ConfigWithFields<object>
    ? Exact<
          Config,
          ModelConfigOptions<T, Config, IsTyped, InList, Seen, TypeSet>
      >
    : TypeError<{
          message: `Model configs must either be a type string (e.g. 'string[]' or 'user?'), a config object with such a value as its 'type' property, or a config object with fields that meet these requirements.`
          value: Config
      }>

// type RootModelConfig<Definitions, TypeDef extends string> = {
//     type: ValidatedPropDef<keyof Definitions & string, TypeDef>
// } & ModelConfig<ParseType<Definitions, TypeDef>>

type ModelConfigOptions<
    T,
    Config,
    IsTyped extends boolean,
    InList extends boolean,
    Seen,
    TypeSet
> = BaseModelConfigOptions<T, Config, IsTyped, TypeSet> &
    (Unlisted<T> extends NonRecursible | Seen
        ? {}
        : RecursibleModelConfigOptions<
              T,
              IsTyped,
              InList,
              Seen,
              TypeSet,
              Config
          >) &
    (InList extends false ? { idKey?: string } : {})

type BaseModelConfigOptions<T, Config, IsTyped extends boolean, TypeSet> = {
    validate?: (_: T) => boolean
    onChange?: (updates: T, original: T) => void
} & (IsTyped extends true
    ? {}
    : {
          type?: TypeDefinition<TypeSet, KeyValuate<Config, "type">>
      })

type RecursibleModelConfigOptions<
    T,
    IsTyped extends boolean,
    InList extends boolean,
    Seen,
    TypeSet,
    Config
> = {
    fields?: {
        [K in keyof Unlisted<T>]?: ModelConfigRecurse<
            Unlisted<T>[K],
            KeyValuate<KeyValuate<Config, "fields">, K>,
            Config extends ConfigWithType<string> ? true : IsTyped,
            T extends any[] ? true : InList,
            Seen | Unlisted<T>,
            TypeSet
        >
    }
    defines?: string
}

export type ModelConfigs<TypeSet, Configs> = {
    [ModelPath in keyof Configs]: RootModelConfig<Configs[ModelPath], TypeSet>
}

const createStore = <
    Config extends ModelConfigs<TypeSetFromConfig<Config>, Config>
>(
    config: Narrow<Config>
) => {
    return {} as ConfigType<Config>
}

const store = createStore({
    users: {
        defines: "user",
        fields: {
            name: "string",
            bestFriend: "user",
            friends: {
                type: "user[]"
            },
            groups: "group[]",
            nested: {
                fields: {
                    another: "string",
                    user: "user[]"
                }
            }
        }
    },
    str: "string",
    grp: {
        type: "group | user"
    },
    preferences: {
        fields: {
            darkMode: "boolean",
            advanced: {
                fields: {
                    bff: "user?"
                }
            }
        }
    },
    groups: {
        defines: "group",
        fields: {
            name: "string",
            description: "string?",
            members: "user[]",
            owner: "user"
        }
        // idKey: "",
        // fields: {
        //     name: {
        //         onChange: (_) => console.log(_)
        //     },
        //     members: {
        //         onChange: (updated, original) => {},
        //         fields: {
        //             groups: {}
        //         }
        //     }
        // },
        // onChange: (groups) => console.log(groups.map((_) => _.name).join(","))
    }
})

type DefinedConfig<DefinedType extends string> = {
    defines: DefinedType
}

type DefinedTypeNames<Configs> = ToolbeltObject.Invert<
    {
        [ModelPath in keyof Configs]: Configs[ModelPath] extends DefinedConfig<
            infer DefinedType
        >
            ? DefinedType
            : never
    }
>

type UpfilterTypes<Config> = Config extends TypeDefOnly<infer TypeDef>
    ? TypeDef
    : Config extends ConfigWithType<infer TypeDef>
    ? TypeDef
    : Config extends ConfigWithFields<infer Fields>
    ? {
          [K in keyof Fields]: UpfilterTypes<Fields[K]>
      }
    : never

type TypeSetFromConfig<Config> = {
    [TypeName in keyof DefinedTypeNames<Config>]: UpfilterTypes<
        KeyValuate<Config, DefinedTypeNames<Config>[TypeName]>
    >
}

type ConfigType<Config> = {
    [ModelPath in keyof Config]: ParseType<
        TypeSetFromConfig<Config>,
        UpfilterTypes<Config[ModelPath]>
    >
}
