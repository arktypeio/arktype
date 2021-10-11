import {
    NonRecursible,
    Unlisted,
    KeyValuate,
    Segment,
    Join,
    TypeError,
    Narrow,
    ListPossibleTypes,
    ValueAtPath,
    FromEntries,
    Stringifiable,
    Key,
    Recursible,
    IsAnyOrUnknown,
    InvalidPropertyError,
    Evaluate,
    Merge,
    Invert
} from "@re-do/utils"
import {
    ParseType,
    TypeDefinition,
    TypeSet,
    ComponentTypesOfStringDefinition
} from "parsetype"

/**
 * This is a hacky version of ExactObject from @re-do/utils that accomodates anomalies
 * in the way TS interprets a statelessly config to avoid widening. Notable differences:
 * - Assumes Compare is passed as an arg directly and therefore will always be a simple
 *   object, so we don't have to worry about things like optional properties that only exist
 *   on a type. We do still have to worry about any/unknown as they can be inferred.
 * - Bails out as soon as it detects Compare is not assignable to Base as opposed to only
 *   comparing recursibles
 * - Can't detect missing required keys at top level
 */
export type ValidatedConfig<
    Compare,
    Base,
    C = Compare,
    B = Recursible<Base>
> = {
    [K in keyof C]: K extends keyof B
        ? IsAnyOrUnknown<C[K]> extends true
            ? B[K]
            : C[K] extends B[K]
            ? C[K] extends NonRecursible
                ? C[K]
                : ValidatedConfig<C[K], B[K]>
            : B[K]
        : InvalidPropertyError<B, K>
}

type TypeNamesToResolverPathsRecurse<Config, Path extends string> = {
    [K in keyof Config]: IsAnyOrUnknown<Config[K]> extends false
        ? "stores" extends keyof Config[K]
            ? [Config[K]["stores"], `${Path}${K & string}`]
            : "fields" extends keyof Config[K]
            ? TypeNamesToResolverPathsRecurse<
                  Config[K]["fields"],
                  `${Path}${K & string}/`
              >
            : never
        : never
}[keyof Config]

type TypeNamesToResolverPaths<Config> = FromEntries<
    ListPossibleTypes<TypeNamesToResolverPathsRecurse<Config, "">>
>

type ResolverPathsToTypeNames<Config> = Invert<TypeNamesToResolverPaths<Config>>

type TypeDefFromConfig<Config> = {
    [K in keyof Config]: IsAnyOrUnknown<Config[K]> extends true
        ? never
        : Config[K] extends string
        ? Config[K]
        : "type" extends keyof Config[K]
        ? Config[K]["type"]
        : "fields" extends keyof Config[K]
        ? TypeDefFromConfig<Config[K]["fields"]>
        : TypeError<`Untyped config`>
}

type TypeSetFromConfig<
    Config,
    DefinedTypes = TypeNamesToResolverPaths<Config>,
    TypeDef = TypeDefFromConfig<Config>
> = {
    [TypeName in keyof DefinedTypes]: ValueAtPath<
        TypeDef,
        DefinedTypes[TypeName] & string
    >
}

type TypeFromConfig<Config, ConfigTypeSet> = {
    [K in keyof Config]: "stores" extends keyof Config[K]
        ? ParseType<TypeDefFromConfig<Config>[K], ConfigTypeSet>[]
        : ParseType<TypeDefFromConfig<Config>[K], ConfigTypeSet>
}

export type ModelConfig<Config, ConfigTypeSet, ConfigType> = {
    [K in keyof Config]: ValidatedConfig<
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
    InResolver extends boolean,
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
          InResolver,
          Seen,
          Path,
          ConfigTypeSet,
          DeclaredTypeNames
      >

type ModelConfigOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InResolver extends boolean,
    Seen,
    Path extends Segment[],
    ConfigTypeSet,
    DeclaredTypeNames extends string[]
> = ModelConfigBaseOptions<T, Config> &
    ModelConfigTypeOptions<
        T,
        Config,
        PathToType,
        InResolver,
        Path,
        ConfigTypeSet,
        DeclaredTypeNames
    > &
    ModelConfigFieldOptions<
        T,
        Config,
        PathToType,
        InResolver,
        Seen,
        Path,
        ConfigTypeSet,
        DeclaredTypeNames
    > &
    ModelConfigDefinitionOptions<T, Config, InResolver, Seen, DeclaredTypeNames>

type ModelConfigBaseOptions<T, Config> = {
    validate?: (value: T) => boolean
    onChange?: (updates: T) => void
}

type ModelConfigTypeOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InResolver extends boolean,
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
              type: "type" extends keyof Config
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
    InResolver extends boolean,
    Seen,
    DeclaredTypeNames extends string[]
> = ConfigIfRecursible<
    T,
    Seen,
    InResolver extends false
        ? {
              stores?: string
          }
        : {}
>

type ModelConfigFieldOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InResolver extends boolean,
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
                      "stores" extends keyof Config ? true : InResolver,
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
    OptionsTypeSet = {},
    ConfigTypeSet = OptionsTypeSet & TypeSetFromConfig<Config>,
    ConfigType = TypeFromConfig<Config, ConfigTypeSet>,
    A extends Actions<ConfigType> = {},
    StoredTypes = TypeNamesToResolverPaths<Config>
>(
    config: Narrow<Config>,
    options?: {
        predefined?: TypeSet<OptionsTypeSet>
        actions?: A
    }
) => {
    return {} as Store<ConfigType, Config, ConfigTypeSet, StoredTypes>
}

const store = createStore({
    users: {
        stores: "user",
        fields: {
            name: {
                type: "string",
                onChange: () => ":-)"
            },
            groups: {
                type: "group[]",
                onChange: (_) => {}
            },
            bestFriend: "user"
        }
    },
    groups: {
        stores: "group",
        fields: {
            name: {
                type: "string",
                onChange: (_) => ""
            },
            members: {
                type: "user[]"
            }
        }
    },
    preferences: {
        fields: {
            darkMode: "boolean",
            colors: {
                stores: "color",
                type: {
                    RGB: "string"
                }
            }
        }
    },
    cache: {
        fields: {
            currentUser: "user"
        }
    }
})
    .users.all()
    .map((_) => _.groups)

export type Store<
    Data,
    Config,
    ConfigTypeSet,
    StoredTypes,
    IdKey extends string = "id",
    Path extends string = ""
> = {
    [K in keyof Data]: K extends keyof Config
        ? "stores" extends keyof Config[K]
            ? Interactions<Unlisted<Data[K]> & object, IdKey>
            : Store<
                  Data[K],
                  Config[K],
                  ConfigTypeSet,
                  `${Path}/${K & Stringifiable}`,
                  IdKey
              >
        : Data[K]
}

export type SimpleUnpack<O, IdKey extends string, Seen = O> = {
    [K in keyof O]: O[K] extends Seen
        ? number
        : SimpleUnpack<O[K], IdKey, Seen | O> & { [K in IdKey]: number }
}

import { DeepPartial, DeepUpdate, LimitDepth } from "@re-do/utils"
export type { Middleware } from "redux"

export type StoreInput = Record<string, any>

export type UpdateFunction<Input extends StoreInput> = (
    args: any,
    context: any
) => Update<Input> | Promise<Update<Input>>

export type Actions<Input> = Record<
    string,
    Update<Input> | UpdateFunction<Input>
>

// export type Query<T> = {
//     [P in keyof T]?: Unlisted<T[P]> extends NonRecursible
//         ? true
//         : Query<Unlisted<T[P]>> | true
// }

export type Update<T> = DeepUpdate<T>

// export type ActionData<T> = {
//     type: string
//     payload: DeepPartial<T>
//     meta: {
//         statelessly: true
//         bypassOnChange?: boolean
//     }
// }

// export type StoreActions<A extends Actions<StoreInput>> = {
//     [K in keyof A]: A[K] extends (...args: any) => any
//         ? (
//               ...args: RemoveContextFromArgs<Parameters<A[K]>>
//           ) => ReturnType<A[K]> extends Promise<any> ? Promise<void> : void
//         : () => void
// }

// // This allows us to convert from the user provided actions, which can use context to access
// // the store in their definitions, to actions as they are attached to the Store, which do not
// // require context as a parameter as it is passed internally

// type RemoveContextFromArgs<T extends unknown[]> = T extends []
//     ? []
//     : T extends [infer Current, ...infer Rest]
//     ? Current extends Store<any, any, any>
//         ? RemoveContextFromArgs<Rest>
//         : [Current, ...RemoveContextFromArgs<Rest>]
//     : T

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

// export type Unpack<
//     O,
//     Definition,
//     Entities,
//     IdKey extends string,
//     SeenEntityName = never,
//     EntityNames extends string[] = ListPossibleTypes<keyof Entities>,
//     BaseEntityName = Definition extends string
//         ? ComponentTypesOfStringDefinition<Definition & string, EntityNames>
//         : null
// > = {
//     [K in keyof O]: K extends keyof Definition
//         ? Definition[K] extends string
//             ? BaseEntityName extends keyof Entities
//                 ? BaseEntityName extends SeenEntityName
//                     ? number
//                     : WithId<
//                           Unpack<
//                               O[K],
//                               Entities[BaseEntityName],
//                               Entities,
//                               IdKey,
//                               SeenEntityName | BaseEntityName
//                           >,
//                           IdKey
//                       >
//                 : O[K]
//             : Unpack<O[K], Definition[K], Entities, IdKey, SeenEntityName>
//         : O[K]
// }

// export type FindBy<O extends object> = (o: O) => boolean

// export type Shallow<O> = LimitDepth<O, 1, number>

// export type ShallowWithId<
//     O extends object,
//     IdFieldName extends string
// > = WithId<Shallow<O>, IdFieldName>

// export type WithId<O extends object, IdFieldName extends string> = O &
//     Record<IdFieldName extends string ? IdFieldName : never, number>

// export type WithIds<O extends object, IdFieldName extends string> = WithId<
//     {
//         [K in keyof O]: O[K] extends object ? WithIds<O[K], IdFieldName> : O[K]
//     },
//     IdFieldName
// >

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
//                     _.forEach((group) => console.log(group.description))
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
