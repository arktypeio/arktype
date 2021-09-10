import {
    NonRecursible,
    Unlisted,
    KeyValuate,
    ValueAtPath,
    ValueAtPathList,
    Segment,
    Join
} from "@re-do/utils"
import { Object as ToolbeltObject } from "ts-toolbelt"
import { ParseType, ValidatedPropDef, TypeDefinition } from "./createTypes"
import { TypeError, Narrow, Exact, ForceEvaluate } from "./utils"

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

type TypeFromConfig<Config, TypeSet = TypeSetFromConfig<Config>> = {
    [K in keyof Config]: "defines" extends keyof Config[K]
        ? ParseType<TypeSet, TypeDefFromConfig<Config>[K]>[]
        : ParseType<TypeSet, TypeDefFromConfig<Config>[K]>
}

export type ModelConfig<Config, TypeSet, ConfigType> = {
    [K in keyof Config]: Exact<
        Config[K],
        ModelConfigRecurse<
            KeyValuate<ConfigType, K>,
            Config[K],
            null,
            false,
            never,
            [Extract<K, Segment>],
            TypeSet
        >
    >
}

type ModelConfigRecurse<
    T,
    Config,
    PathToType extends Segment[] | null,
    InDefinition extends boolean,
    Seen,
    Path extends Segment[],
    TypeSet
> = Config extends string
    ? PathToType extends Segment[]
        ? TypeError<`A type has already been determined via ${Join<PathToType>}.`>
        : ValidatedPropDef<Extract<keyof TypeSet, string>, Config>
    : ModelConfigOptions<
          T,
          Config,
          PathToType,
          InDefinition,
          Seen,
          Path,
          TypeSet
      >

type ModelConfigOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InDefinition extends boolean,
    Seen,
    Path extends Segment[],
    TypeSet
> = ModelConfigBaseOptions<T> &
    ModelConfigTypeOptions<T, Config, PathToType, Path, TypeSet> &
    ModelConfigFieldOptions<
        T,
        Config,
        PathToType,
        InDefinition,
        Seen,
        Path,
        TypeSet
    > &
    ModelConfigDefinitionOptions<T, InDefinition, Seen>

type ModelConfigBaseOptions<T> = {
    validate?: (value: T) => boolean
    onChange?: (updates: T) => void
}

type ModelConfigTypeOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    Path extends Segment[],
    TypeSet,
    DefinedTypeName extends string = Extract<keyof TypeSet, string>
> = PathToType extends null
    ? "fields" extends keyof Config
        ? {
              type?: TypeDefinition<DefinedTypeName, KeyValuate<Config, "type">>
          }
        : {
              type: "type" extends keyof Config
                  ? TypeDefinition<DefinedTypeName, KeyValuate<Config, "type">>
                  : TypeError<`Unable to determine the type of ${Join<Path>}.`>
          }
    : {}

type ConfigIfRecursible<T, Seen, ValueIfRecursible> = Unlisted<T> extends
    | NonRecursible
    | Seen
    ? {}
    : ValueIfRecursible

type ModelConfigDefinitionOptions<
    T,
    InDefinition extends boolean,
    Seen
> = ConfigIfRecursible<
    T,
    Seen,
    InDefinition extends false
        ? {
              defines?: string
              idKey?: string
          }
        : {}
>

type ModelConfigFieldOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InDefinition extends boolean,
    Seen,
    Path extends Segment[],
    TypeSet
> = ConfigIfRecursible<
    T,
    Seen,
    {
        fields?: {
            [K in keyof Unlisted<T>]?: ModelConfigRecurse<
                Unlisted<T>[K],
                ValueAtPathList<
                    Config,
                    ["fields", Extract<K, string | number>]
                >,
                "type" extends keyof Config ? Path : PathToType,
                "defines" extends keyof Config ? true : InDefinition,
                Seen | Unlisted<T>,
                [...Path, Extract<K, Segment>],
                TypeSet
            >
        }
    }
>

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
