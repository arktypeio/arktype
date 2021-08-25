import {
    Narrow,
    Exact,
    TypeError,
    NonRecursible,
    Unlisted,
    KeyValuate
} from "@re-do/utils"
import {
    ParseType,
    ValidatedPropDef,
    TypeDefinition,
    NonStringOrRecord
} from "./createTypes"
import { Object as ToolbeltObject } from "ts-toolbelt"

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
    : TypeError<{
          message: `Untyped config value`
          value: Config
      }>

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

type TypeDefOnly<TypeDef extends string> = TypeDef

type ConfigWithType<TypeDef extends string> = {
    type: TypeDef
}

type ConfigWithFields<Fields extends object> = {
    fields: Fields
}

type RootModelConfig<Config, TypeSet> = Exact<
    Config,
    ModelConfigRecurse<
        ParseType<TypeSet, UpfilterTypes<Config>>,
        Config,
        false,
        false,
        never,
        TypeSet
    >
>

export type ModelConfigRecurse<
    T,
    Config,
    IsTyped extends boolean,
    InDefinition extends boolean,
    Seen,
    TypeSet
> = Config extends NonStringOrRecord
    ? TypeError<{
          message: `Config must be a type string (e.g. 'user[]?') or an object.`
          value: Config
      }>
    : Config extends object
    ? ModelConfigOptions<T, Config, IsTyped, InDefinition, Seen, TypeSet>
    : Config extends TypeDefOnly<infer TypeDef>
    ? IsTyped extends true
        ? TypeError<{
              message: `A type has already been determined from an ancestor of this config`
              providedType: Config
              inferredType: T
          }>
        : ValidatedPropDef<keyof TypeSet & string, TypeDef>
    : TypeError<{
          message: `Unexpected config value`
          value: Config
      }>

type ModelConfigOptions<
    T,
    Config,
    IsTyped extends boolean,
    InDefinition extends boolean,
    Seen,
    TypeSet
> = BaseModelConfigOptions<T, Config, IsTyped, TypeSet> &
    (Unlisted<T> extends NonRecursible | Seen
        ? {}
        : RecursibleModelConfigOptions<
              T,
              IsTyped,
              InDefinition,
              Seen,
              TypeSet,
              Config
          >)

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
    InDefinition extends boolean,
    Seen,
    TypeSet,
    Config
> = {
    fields?: {
        [K in keyof Unlisted<T>]?: ModelConfigRecurse<
            Unlisted<T>[K],
            KeyValuate<KeyValuate<Config, "fields">, K>,
            Config extends ConfigWithType<string> ? true : IsTyped,
            Config extends DefinedConfig<string> ? true : InDefinition,
            Seen | Unlisted<T>,
            TypeSet
        >
    }
} & (InDefinition extends true
    ? {}
    : {
          defines?: string
          idKey?: string
      })

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
            groups: {
                type: "group[]",
                fields: {
                    name: {
                        onChange: () => {}
                    }
                }
            },
            nested: {
                fields: {
                    another: "string",
                    user: {
                        type: "user[]",
                        onChange: () => {}
                    }
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
