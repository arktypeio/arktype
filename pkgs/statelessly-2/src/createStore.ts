import {
    NonRecursible,
    Unlisted,
    KeyValuate,
    ValueAtPath,
    ValueAtPathList
} from "@re-do/utils"
import {
    Object as ToolbeltObject,
    Function as ToolbeltFunction
} from "ts-toolbelt"
import {
    ParseType,
    ValidatedPropDef,
    TypeDefinition,
    NonStringOrRecord
} from "./createTypes"
import {
    TypeError,
    Narrow,
    Exact,
    ForceEvaluate,
    IsAny,
    StringifyPossibleTypes,
    StringifyKeys,
    Recursible,
    Exact2
} from "./utils"

type TypeNamesToKeys<Config> = ToolbeltObject.Invert<
    {
        [K in keyof Config]: "defines" extends keyof Config[K]
            ? Extract<Config[K]["defines"], string>
            : never
    }
>

type TypeDefFromConfig<Config> = {
    [K in keyof Config]: Config[K] extends string
        ? Config[K]
        : "type" extends keyof Config[K]
        ? Config[K]["type"]
        : "fields" extends keyof Config[K]
        ? TypeDefFromConfig<Config[K]["fields"]>
        : TypeError<`Untyped config`>
}

type TypeSetFromConfig<
    Config,
    DefinedTypes = TypeNamesToKeys<Config>,
    TypeDef = TypeDefFromConfig<Config>
> = {
    [TypeName in keyof DefinedTypes]: KeyValuate<
        TypeDef,
        DefinedTypes[TypeName]
    >
}

type TypeFromConfig<Config, TypeSet = TypeSetFromConfig<Config>> = ParseType<
    TypeSet,
    TypeDefFromConfig<Config>
>

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
> = Config extends string
    ? IsTyped extends true
        ? TypeError<`A type has already been determined from an ancestor of this config.`>
        : ValidatedPropDef<Extract<keyof TypeSet, string>, Config>
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
    validate?: (value: T) => boolean
    onChange?: (updates: T) => void
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
    // mandatory: string
    fields?: {
        [K in keyof Unlisted<T>]?: ModelConfigRecurse<
            Unlisted<T>[K],
            ValueAtPathList<Config, ["fields", Extract<K, string | number>]>,
            "type" extends keyof Config ? true : IsTyped,
            "defines" extends keyof Config ? true : InDefinition,
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

export type ModelConfig<Config, TypeSet, ConfigType> = {
    [ModelPath in keyof Config]: RootModelConfig<
        KeyValuate<ConfigType, ModelPath>,
        Config[ModelPath],
        TypeSet
    >
}

const createStore = <
    Config extends ModelConfig<Config, TypeSet, ConfigType>,
    TypeSet = TypeSetFromConfig<Config>,
    ConfigType = TypeFromConfig<Config, TypeSet>
>(
    config: Narrow<Config>
) => {
    return {} as ConfigType
}

const store = createStore({
    users: {
        defines: "user",
        fields: {
            name: {
                type: "string",
                onChange: () => ":-)"
            },
            groups: {
                type: "group[]"
            }
        }
    },
    groups: {
        defines: "group",
        fields: {
            name: {
                type: "string",
                onChange: (_) => ""
            }
        }
    }
})

// const store2 = createStore({
//     users: {
//         defines: "user",
//         fields: {
//             name: {
//                 type: "string",
//                 onChange: (_) => {}
//             },
//             unknownF: {
//                 type: "string",
//                 onChange: () => {}
//             },
//             bestFriend: "user",
//             friends: {
//                 type: "user[]"
//             },
//             groups: {
//                 type: "group[]",
//                 onChange: (_) =>
//                     _.forEach((group) => console.log(group.description)),
//                 fields: {
//                     name: {
//                         onChange: (_) => {}
//                     }
//                 }
//             },
//             nested: {
//                 fields: {
//                     another: {
//                         type: "string",
//                         onChange: () => {}
//                     },
//                     user: {
//                         type: "user[]",
//                         onChange: () => {}
//                     }
//                 }
//             }
//         }
//     },
//     str: "string",
//     grp: {
//         type: "group | user"
//     },
//     zo: "group",
//     preferences: {
//         fields: {
//             darkMode: "boolean",
//             advanced: {
//                 fields: {
//                     bff: "user?"
//                 }
//             }
//         }
//     },
//     groups: {
//         defines: "group",
//         idKey: "",
//         fields: {
//             name: {
//                 type: "string",
//                 onChange: () => {}
//             },
//             description: "string?",
//             members: "user[]",
//             owner: "user"
//         }
//     }
// })
