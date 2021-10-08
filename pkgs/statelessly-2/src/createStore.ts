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
    ListPossibleTypes,
    Cast,
    TransformCyclic,
    PathTo,
    Evaluate,
    ExcludeByValue,
    PathOf,
    LeafOf,
    ValueAtPath,
    Recursible,
    IsAnyOrUnknown,
    StringifyKeys,
    Key,
    NonObject,
    RequiredKeys,
    DeepEvaluate,
    IsUnknown,
    ExactObject,
    SimpleFunction
} from "@re-do/utils"
import { Object as ToolbeltObject } from "ts-toolbelt"
import {
    ParseType,
    TypeDefinition,
    TypeSet,
    ComponentTypesOfStringDefinition
} from "parsetype"
// import { Actions, Interactions } from "common"

type DefinitionsFromConfig<Config> = ExcludeByValue<
    {
        [K in keyof Config]: "defines" extends keyof Config[K]
            ? Config[K]["defines"]
            : "fields" extends keyof Config[K]
            ? DefinitionsFromConfig<Config[K]["fields"]>
            : never
    },
    never
>

type PathsToDefinitions<
    Config,
    ConfigDefinitions = DefinitionsFromConfig<Config>,
    DefinitionPaths extends string = LeafOf<ConfigDefinitions>
> = {
    [Path in DefinitionPaths]: Cast<
        ValueAtPath<ConfigDefinitions, Path>,
        string
    >
}

type TypeNamesToDefinitionPaths<Config> = ToolbeltObject.Invert<
    PathsToDefinitions<Config>
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
    DefinedTypes = TypeNamesToDefinitionPaths<Config>,
    TypeDef = TypeDefFromConfig<Config>
> = {
    [TypeName in keyof DefinedTypes]: KeyValuate<
        TypeDef,
        DefinedTypes[TypeName]
    >
}

type TypeFromConfig<Config, ConfigTypeSet = TypeSetFromConfig<Config>> = {
    [K in keyof Config]: "defines" extends keyof Config[K]
        ? ParseType<TypeDefFromConfig<Config>[K], ConfigTypeSet>[]
        : ParseType<TypeDefFromConfig<Config>[K], ConfigTypeSet>
}

type ETU<
    A,
    B,
    MissingKeys extends Key = Exclude<RequiredKeys<A>, keyof Recursible<B>>
> = {
    [K in keyof A]: K extends keyof B
        ? IsAnyOrUnknown<A[K]> extends true
            ? B[K]
            : IsAnyOrUnknown<B[K]> extends true
            ? A[K]
            : A[K] extends NonRecursible
            ? A[K] extends B[K]
                ? A[K]
                : B[K]
            : ETU<A[K], Recursible<B[K]>>
        : `Invalid property '${Extract<
              K,
              string | number
          >}'. Valid properties are: ${StringifyKeys<B>}`
}
//     & {
//     [K in MissingKeys]: K extends keyof Recursible<B> ? Recursible<B>[K] : never
// }

export type ModelConfig<Config, ConfigTypeSet, ConfigType> = {
    [K in keyof Config]: ETU<
        Config[K],
        ModelConfigRecurse<
            KeyValuate<ConfigType, K>,
            Config[K],
            null,
            false,
            never,
            [K & Segment],
            ConfigTypeSet,
            ListPossibleTypes<keyof ConfigTypeSet & string>
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
    ConfigTypeSet,
    DeclaredTypeNames extends string[]
> = Config extends string
    ? PathToType extends Segment[]
        ? TypeError<`A type has already been determined via ${Join<PathToType>}.`>
        : TypeDefinition<Config, DeclaredTypeNames>
    : ModelConfigOptions<
          T,
          Config,
          PathToType,
          InDefinition,
          Seen,
          Path,
          ConfigTypeSet,
          DeclaredTypeNames
      >

type ModelConfigOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InDefinition extends boolean,
    Seen,
    Path extends Segment[],
    ConfigTypeSet,
    DeclaredTypeNames extends string[]
> = ModelConfigBaseOptions<T, Config> &
    ModelConfigTypeOptions<
        T,
        Config,
        PathToType,
        Path,
        ConfigTypeSet,
        DeclaredTypeNames
    > &
    ModelConfigFieldOptions<
        T,
        Config,
        PathToType,
        InDefinition,
        Seen,
        Path,
        ConfigTypeSet,
        DeclaredTypeNames
    > &
    ModelConfigDefinitionOptions<T, Config, InDefinition, Seen>

type ModelConfigBaseOptions<T, Config> = {
    validate?: (value: T) => boolean
    onChange?: (updates: T) => void
}

type ModelConfigTypeOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    Path extends Segment[],
    ConfigTypeSet,
    DeclaredTypeNames extends string[]
> = PathToType extends null
    ? "fields" extends keyof Config
        ? {
              type?: TypeDefinition<
                  KeyValuate<Config, "type">,
                  DeclaredTypeNames
              >
          }
        : {
              type?: "type" extends keyof Config
                  ? TypeDefinition<
                        KeyValuate<Config, "type">,
                        DeclaredTypeNames
                    >
                  : `Unable to determine the type of ${Join<Path>}.`
          }
    : {}

type ConfigIfRecursible<T, Seen, ValueIfRecursible> = Unlisted<T> extends
    | NonRecursible
    | Seen
    ? {}
    : ValueIfRecursible

type ModelConfigDefinitionOptions<
    T,
    Config,
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
    ConfigTypeSet,
    DeclaredTypeNames extends string[],
    ConfigFields = "fields" extends keyof Config ? Config["fields"] : never
> = ConfigIfRecursible<
    T,
    Seen,
    {
        fields?: {
            [K in keyof Unlisted<T>]?: K extends keyof ConfigFields
                ? ModelConfigRecurse<
                      KeyValuate<Unlisted<T>, K>,
                      ConfigFields[K],
                      "type" extends keyof Config ? Path : PathToType,
                      "defines" extends keyof Config ? true : InDefinition,
                      Seen | Unlisted<T>,
                      [...Path, K & Segment],
                      ConfigTypeSet,
                      DeclaredTypeNames
                  >
                : never
        }
    }
>

export const createStore = <
    Config extends ModelConfig<Config, ConfigTypeSet, ConfigType>,
    // OptionsTypeSet,
    ConfigTypeSet = {
        user: {
            name: "string"
            groups: "group[]"
        }
        group: {
            name: "string"
        }
        color: {
            RGB: "string"
        }
    },
    // TypeSetFromConfig<Config>,
    ConfigType = TypeFromConfig<Config, ConfigTypeSet>
    // A extends Actions<ConfigType> = {}
>(
    config: Narrow<Config>,
    options?: {
        // predefined?: TypeSet<OptionsTypeSet>
        // actions?: A
    }
) => {
    return {} as DeepEvaluate<Config> //Store<ConfigType, Config, TypeSet>
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
                type: "group[]",
                onChange: (_) => {}
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
    },
    preferences: {
        fields: {
            darkMode: "boolean",
            colors: {
                defines: "color",
                type: {
                    RGB: "string"
                }
            }
        }
    }
})

export type Store<
    Data,
    Config,
    ConfigTypeSet,
    Path extends Segment[] = [],
    IdKey extends string = "id",
    DefinitionPathsToTypeNames = PathsToDefinitions<Config>,
    ConfigDefinitions = DefinitionsFromConfig<Config>
> = {
    [K in keyof Data]: K extends keyof Config
        ? Join<Path> extends keyof DefinitionPathsToTypeNames
            ? Interactions<Cast<Unlisted<Data[K]>, object>, IdKey>
            : Store<
                  Data[K],
                  Config[K],
                  ConfigTypeSet,
                  [...Path, K & Segment],
                  IdKey,
                  DefinitionPathsToTypeNames
              >
        : Data[K]
}

import { DeepPartial, DeepUpdate, LimitDepth } from "@re-do/utils"
export type { Middleware } from "redux"

// type Store<A, B, C> = any

export type StoreInput = Record<string, any>

export type UpdateFunction<Input extends StoreInput> = (
    args: any,
    context: Store<Input, any, any>
) => Update<Input> | Promise<Update<Input>>

export type Actions<Input> = Record<
    string,
    Update<Input> | UpdateFunction<Input>
>

export type Query<T> = {
    [P in keyof T]?: Unlisted<T[P]> extends NonRecursible
        ? true
        : Query<Unlisted<T[P]>> | true
}

export type Update<T> = DeepUpdate<T>

export type ActionData<T> = {
    type: string
    payload: DeepPartial<T>
    meta: {
        statelessly: true
        bypassOnChange?: boolean
    }
}

export type StoreActions<A extends Actions<StoreInput>> = {
    [K in keyof A]: A[K] extends (...args: any) => any
        ? (
              ...args: RemoveContextFromArgs<Parameters<A[K]>>
          ) => ReturnType<A[K]> extends Promise<any> ? Promise<void> : void
        : () => void
}

// This allows us to convert from the user provided actions, which can use context to access
// the store in their definitions, to actions as they are attached to the Store, which do not
// require context as a parameter as it is passed internally

type RemoveContextFromArgs<T extends unknown[]> = T extends []
    ? []
    : T extends [infer Current, ...infer Rest]
    ? Current extends Store<any, any, any>
        ? RemoveContextFromArgs<Rest>
        : [Current, ...RemoveContextFromArgs<Rest>]
    : T

// store.users.all().forEach((user) => {
//     user.groups.map((_) => _)
// })

export type Interactions<O extends object, IdKey extends string> = {
    // create: <U extends boolean = true>(o: O) => Data<O, IdKey, U>
    all: () => SimpleUnpack<O, IdKey>[]
    // find: <U extends boolean = true>(
    //     by: FindBy<Data<O, IdKey, U>>
    // ) => Data<O, IdKey, U>
    // filter: <U extends boolean = true>(
    //     by: FindBy<Data<O, IdKey, U>>
    // ) => Data<O, IdKey, U>[]
    // remove: <U extends boolean = true>(by: FindBy<Data<O, IdKey, U>>) => void
    // update: (
    //     by: FindBy<Data<O, IdKey, false>>,
    //     update: DeepUpdate<Data<O, IdKey, false>>
    // ) => void
}

export type SimpleUnpack<O, IdKey extends string, Seen = never> = {
    [K in keyof O]: O[K] extends Seen
        ? number
        : SimpleUnpack<O[K], IdKey, Seen | O> & { [K in IdKey]: number }
}

export type Unpack<
    O,
    Definition,
    Entities,
    IdKey extends string,
    SeenEntityName = never,
    EntityNames extends string[] = ListPossibleTypes<keyof Entities>,
    BaseEntityName = Definition extends string
        ? ComponentTypesOfStringDefinition<Definition & string, EntityNames>
        : null
> = {
    [K in keyof O]: K extends keyof Definition
        ? Definition[K] extends string
            ? BaseEntityName extends keyof Entities
                ? BaseEntityName extends SeenEntityName
                    ? number
                    : WithId<
                          Unpack<
                              O[K],
                              Entities[BaseEntityName],
                              Entities,
                              IdKey,
                              SeenEntityName | BaseEntityName
                          >,
                          IdKey
                      >
                : O[K]
            : Unpack<O[K], Definition[K], Entities, IdKey, SeenEntityName>
        : O[K]
}

export type FindBy<O extends object> = (o: O) => boolean

export type Shallow<O> = LimitDepth<O, 1, number>

export type ShallowWithId<
    O extends object,
    IdFieldName extends string
> = WithId<Shallow<O>, IdFieldName>

export type WithId<O extends object, IdFieldName extends string> = O &
    Record<IdFieldName extends string ? IdFieldName : never, number>

export type WithIds<O extends object, IdFieldName extends string> = WithId<
    {
        [K in keyof O]: O[K] extends object ? WithIds<O[K], IdFieldName> : O[K]
    },
    IdFieldName
>

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
