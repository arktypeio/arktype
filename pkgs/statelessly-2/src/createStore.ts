import {
    NonRecursible,
    Unlisted,
    KeyValuate,
    ValueAtPathList,
    Segment,
    Join,
    TypeError,
    Narrow,
    Exact,
    ElementOf,
    Evaluate,
    ListPossibleTypes
} from "@re-do/utils"
import { Object as ToolbeltObject } from "ts-toolbelt"
import { ParseType, ValidateTypeDefinition, ValidateTypeSet } from "parsetype"
import { Actions, Interactions } from "common"

type TypeNamesToKeys<Config> = ToolbeltObject.Invert<
    {
        [K in keyof Config]: "defines" extends keyof Config[K]
            ? Config[K]["defines"] & string
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
        ? ParseType<TypeDefFromConfig<Config>[K], TypeSet>[]
        : ParseType<TypeDefFromConfig<Config>[K], TypeSet>
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
            [K & Segment],
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
    TypeSet,
    DeclaredTypeNames extends string[] = ListPossibleTypes<
        keyof TypeSet & string
    >
> = Config extends string
    ? PathToType extends Segment[]
        ? TypeError<`A type has already been determined via ${Join<PathToType>}.`>
        : ValidateTypeDefinition<Config, DeclaredTypeNames>
    : ModelConfigOptions<
          T,
          Config,
          PathToType,
          InDefinition,
          Seen,
          Path,
          TypeSet,
          DeclaredTypeNames
      >

type ModelConfigOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InDefinition extends boolean,
    Seen,
    Path extends Segment[],
    TypeSet,
    DeclaredTypeNames extends string[]
> = ModelConfigBaseOptions<T> &
    ModelConfigTypeOptions<
        T,
        Config,
        PathToType,
        Path,
        TypeSet,
        DeclaredTypeNames
    > &
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
    DeclaredTypeNames extends string[]
> = PathToType extends null
    ? "fields" extends keyof Config
        ? {
              type?: ValidateTypeDefinition<
                  KeyValuate<Config, "type">,
                  DeclaredTypeNames
              >
          }
        : {
              type: "type" extends keyof Config
                  ? ValidateTypeDefinition<
                        KeyValuate<Config, "type">,
                        DeclaredTypeNames
                    >
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
                ValueAtPathList<Config, ["fields", K & Segment]>,
                "type" extends keyof Config ? Path : PathToType,
                "defines" extends keyof Config ? true : InDefinition,
                Seen | Unlisted<T>,
                [...Path, K & Segment],
                TypeSet
            >
        }
    }
>

export const createStore = <
    Config extends ModelConfig<Config, TypeSet, ConfigType>,
    OptionsTypeSet,
    TypeSet = TypeSetFromConfig<Config>,
    ConfigType = TypeFromConfig<Config, TypeSet>,
    A extends Actions<ConfigType> = {}
>(
    config: Narrow<Config>,
    options?: {
        predefined?: ValidateTypeSet<OptionsTypeSet>
        actions?: A
    }
) => {
    return {} as Store<ConfigType>
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

export type Store<Data, IdKey extends string = "id"> = {
    [K in keyof Data]: Data[K] extends object[]
        ? Interactions<ElementOf<Data[K]>, IdKey>
        : Data[K]
}

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
