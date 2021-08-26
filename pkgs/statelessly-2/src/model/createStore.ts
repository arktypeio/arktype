import { NonRecursible, Unlisted, KeyValuate } from "@re-do/utils"
import { Object as ToolbeltObject } from "ts-toolbelt"
import {
    ParseType,
    ValidatedPropDef,
    TypeDefinition,
    NonStringOrRecord
} from "./createTypes"
import { TypeError, Narrow, Exact, ForceEvaluate } from "./utils"

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
    : TypeError<`Untyped config`>

type TypeSetFromConfig<Config> = {
    [TypeName in keyof DefinedTypeNames<Config>]: UpfilterTypes<
        KeyValuate<Config, DefinedTypeNames<Config>[TypeName]>
    >
}

type TypeFromConfig<Config, TypeSet = TypeSetFromConfig<Config>> = {
    [ModelPath in keyof Config]: ParseType<
        TypeSet,
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

type RootModelConfig<T, Config, TypeSet> = Exact<
    Config,
    ModelConfigRecurse<T, Config, false, false, never, TypeSet>
>

export type ModelConfigRecurse<
    T,
    Config,
    IsTyped extends boolean,
    InDefinition extends boolean,
    Seen,
    TypeSet
> = Config extends NonStringOrRecord
    ? TypeError<`Config must be a type string (e.g. 'user[]?') or an object.`>
    : Config extends TypeDefOnly<infer TypeDef>
    ? IsTyped extends true
        ? TypeError<`A type has already been determined from an ancestor of this config.`>
        : ValidatedPropDef<keyof TypeSet & string, TypeDef>
    : ModelConfigOptions<T, Config, IsTyped, InDefinition, Seen, TypeSet>

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
              Config,
              IsTyped,
              InDefinition,
              Seen,
              TypeSet
          >)

type BaseModelConfigOptions<T, Config, IsTyped extends boolean, TypeSet> = {
    // validate?: (_: N) => boolean
    onChange?: (updates: string) => number
} & (IsTyped extends true
    ? {}
    : {
          type?: TypeDefinition<TypeSet, KeyValuate<Config, "type">>
      })

type RecursibleModelConfigOptions<
    T,
    Config,
    IsTyped extends boolean,
    InDefinition extends boolean,
    Seen,
    TypeSet
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

export type ModelConfig<
    Config,
    TypeSet = TypeSetFromConfig<Config>,
    ConfigType = TypeFromConfig<Config>
> = {
    [ModelPath in keyof Config]: RootModelConfig<
        KeyValuate<ConfigType, ModelPath>,
        Config[ModelPath],
        TypeSet
    >
}

const createStore = <Config extends ModelConfig<Config>>(
    config: Narrow<Config>
) => {
    return {} as TypeSetFromConfig<Config>
}

const store = createStore({
    users: {
        defines: "user",
        fields: {
            name: {
                type: "string",
                onChange: () => {}
            },
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
                    another: {
                        type: "string",
                        onChange: () => {}
                    },
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
        idKey: "",
        fields: {
            name: {
                type: "string",
                onChange: () => {}
            },
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
