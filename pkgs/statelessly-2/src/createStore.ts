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
    DeepUpdate,
    Merge,
    Invert,
    updateMap,
    DeepEvaluate,
    valueAtPath,
    And,
    Or,
    Not,
    ValueOf,
    List
} from "@re-do/utils"
import { ParseType, TypeDefinition, TypeSet } from "parsetype"
import {
    configureStore,
    ConfigureStoreOptions,
    Middleware,
    Store as ReduxStore
} from "@reduxjs/toolkit"

/**
 * This is a hacky version of ExactObject from @re-do/utils that accomodates anomalies
 * in the way TS interprets a statelessly config to avoid widening. Notable differences:
 * - Assumes Compare is passed as an arg directly and therefore will always be a simple
 *   object, so we don't have to worry about things like optional properties that only exist
 *   on a type. We do still have to worry about any/unknown as they can be inferred.
 * - Can't detect missing required keys at top level
 */
export type ValidatedConfig<Config, Options, Opts = Recursible<Options>> = {
    [K in keyof Config]: K extends keyof Opts
        ? IsAnyOrUnknown<Config[K]> extends true
            ? Opts[K]
            : Config[K] extends NonRecursible
            ? Config[K] extends Opts[K]
                ? Config[K]
                : Opts[K]
            : ValidatedConfig<Config[K], Opts[K]>
        : InvalidPropertyError<Opts, K>
}

type FindStoredTypesRecurse<
    Config,
    Path extends string,
    PathsAsKeys extends boolean
> = {
    [K in keyof Config]: IsAnyOrUnknown<Config[K]> extends false
        ? "stores" extends keyof Config[K]
            ? PathsAsKeys extends true
                ? [`${Path}${K & string}`, Config[K]["stores"]]
                : [Config[K]["stores"], `${Path}${K & string}`]
            : "fields" extends keyof Config[K]
            ? FindStoredTypesRecurse<
                  Config[K]["fields"],
                  `${Path}${K & string}/`,
                  PathsAsKeys
              >
            : never
        : never
}[keyof Config]

type GetStoredTypesToPaths<Config> = FromEntries<
    ListPossibleTypes<FindStoredTypesRecurse<Config, "", false>>
>

type GetStoredPathsToTypes<Config> = FromEntries<
    ListPossibleTypes<FindStoredTypesRecurse<Config, "", true>>
>

type DefinitionFromConfig<Config, UseStoredTypes extends boolean> = {
    [K in keyof Config]: IsAnyOrUnknown<Config[K]> extends true
        ? never
        : Config[K] extends string
        ? Config[K]
        : And<
              UseStoredTypes,
              "stores" extends keyof Config[K] ? true : false
          > extends true
        ? `${KeyValuate<Config[K], "stores"> & string}[]`
        : "type" extends keyof Config[K]
        ? Config[K]["type"]
        : "fields" extends keyof Config[K]
        ? DefinitionFromConfig<Config[K]["fields"], UseStoredTypes>
        : TypeError<`Untyped config`>
}

type CompileStoredTypeSet<RawModelDefinition, ResolvedTypes> = Evaluate<
    {
        [TypeName in keyof ResolvedTypes]: ValueAtPath<
            RawModelDefinition,
            ResolvedTypes[TypeName] & string
        >
    }
>

export type StoreConfig<Config, FullTypeSet, ConfigType> = {
    [K in keyof Config]: ValidatedConfig<
        Config[K],
        ModelConfigRecurse<
            KeyValuate<ConfigType, K>,
            Config[K],
            null,
            false,
            never,
            [K & Segment],
            FullTypeSet,
            ListPossibleTypes<keyof FullTypeSet & string>
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
    FullTypeSet,
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
          FullTypeSet,
          DeclaredTypeNames
      >

type ModelConfigOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InResolver extends boolean,
    Seen,
    Path extends Segment[],
    FullTypeSet,
    DeclaredTypeNames extends string[]
> = ModelConfigBaseOptions<T, Config> &
    ModelConfigTypeOptions<
        T,
        Config,
        PathToType,
        InResolver,
        Path,
        FullTypeSet,
        DeclaredTypeNames
    > &
    ModelConfigFieldOptions<
        T,
        Config,
        PathToType,
        InResolver,
        Seen,
        Path,
        FullTypeSet,
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
    FullTypeSet,
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
    FullTypeSet,
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
                      FullTypeSet,
                      DeclaredTypeNames
                  >
                : never
        }
    }
>

export type ReduxOptions = Omit<
    ConfigureStoreOptions,
    "preloadedState" | "reducer"
>

export const createStore = <
    Config extends StoreConfig<Config, FullTypeSet, Model>,
    RawModelDefinition = DefinitionFromConfig<Config, false>,
    StoredTypesToPaths = GetStoredTypesToPaths<Config>,
    StoredPathsToTypes = GetStoredPathsToTypes<Config>,
    StoredTypeSet = CompileStoredTypeSet<
        RawModelDefinition,
        StoredTypesToPaths
    >,
    ProvidedTypeSet = {},
    FullTypeSet = ProvidedTypeSet & StoredTypeSet,
    ModelDefinition = DefinitionFromConfig<Config, true>,
    Model = ParseType<ModelDefinition, FullTypeSet>,
    DeclaredTypeNames extends string[] = ListPossibleTypes<keyof FullTypeSet>,
    StoredTypeReferences = ResolvedConfigPaths<
        RawModelDefinition,
        StoredTypesToPaths,
        DeclaredTypeNames,
        ProvidedTypeSet
    >,
    A extends Actions<Model> = {}
>(
    config: Narrow<Config>,
    options?: {
        typeSet?: Narrow<ProvidedTypeSet>
        actions?: A
        reduxOptions?: ReduxOptions
    }
) => {
    return {} as Store<Model, StoredPathsToTypes, StoredTypeReferences, "">
}

const store = createStore(
    {
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
                bestFriend: "user",
                favoriteColor: "color"
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
                currentUser: "user|null",
                currentCity: "city",
                lastObject: "user|group?"
            }
        }
    },
    {
        typeSet: {
            city: {
                users: "user[]",
                groups: "group[]",
                adjacentCities: "city[]"
            }
        }
    }
)

type Store<
    Model,
    StoredPathsToTypes,
    StoredTypeReferences,
    Path extends string
> = Path extends keyof StoredPathsToTypes
    ? Interactions<Model>
    : Model extends Array<infer Item>
    ? Store<Item, StoredPathsToTypes, StoredTypeReferences, Path>
    : {
          [K in keyof Model]: Model[K] extends NonRecursible
              ? Model[K]
              : Store<
                    Model[K],
                    StoredPathsToTypes,
                    StoredTypeReferences,
                    `${Path}${Path extends "" ? "" : "/"}${K & string}`
                >
      }

type ResolvedConfigPathsRecurse<
    DeepConfigTypeNames,
    Path extends string,
    StoredTypesToPaths,
    DeepProvidedTypeNames,
    Seen
> = {
    [K in keyof DeepConfigTypeNames]: DeepConfigTypeNames[K] extends string
        ? DeepConfigTypeNames[K] extends keyof StoredTypesToPaths
            ? [
                  `${Path}${K & string}`,
                  StoredTypesToPaths[DeepConfigTypeNames[K]]
              ]
            : DeepConfigTypeNames[K] extends keyof DeepProvidedTypeNames
            ? DeepConfigTypeNames[K] extends Seen
                ? never
                : ResolvedConfigPathsRecurse<
                      DeepProvidedTypeNames[DeepConfigTypeNames[K]],
                      `${Path}${K & string}/`,
                      StoredTypesToPaths,
                      DeepProvidedTypeNames,
                      Seen | DeepConfigTypeNames[K]
                  >
            : never
        : ResolvedConfigPathsRecurse<
              DeepConfigTypeNames[K],
              `${Path}${K & string}/`,
              StoredTypesToPaths,
              DeepProvidedTypeNames,
              Seen
          >
}[keyof DeepConfigTypeNames]

type ResolvedConfigPaths<
    RawModelDefinition,
    StoredTypesToPaths,
    DeclaredTypeNames extends string[],
    ProvidedTypeSet
> = Evaluate<
    FromEntries<
        ListPossibleTypes<
            ResolvedConfigPathsRecurse<
                TypeDefinition<
                    RawModelDefinition,
                    DeclaredTypeNames,
                    { extractBaseNames: true }
                >,
                "",
                StoredTypesToPaths,
                TypeDefinition<
                    ProvidedTypeSet,
                    DeclaredTypeNames,
                    { extractBaseNames: true }
                >,
                never
            >
        >
    >
>

export type Interactions<Model, Input = Unlisted<Model>, Stored = Input> = {
    create: (data: Input) => Stored
    all: () => Stored[]
    find: (by: FindBy<Stored>) => Stored
    filter: (by: FindBy<Stored>) => Stored
    remove: (by: FindBy<Stored>) => void
    update: (by: FindBy<Stored>, update: DeepUpdate<Input>) => Stored
}

export type SimpleUnpack<O, IdKey extends string, Seen = O> = {
    [K in keyof O]: O[K] extends Seen
        ? number
        : SimpleUnpack<O[K], IdKey, Seen | O> & { [K in IdKey]: number }
}

export type StoreInput = Record<string, any>

export type UpdateFunction<Input extends StoreInput> = (
    args: any,
    context: any
) => Update<Input> | Promise<Update<Input>>

export type Actions<Input> = Record<
    string,
    Update<Input> | UpdateFunction<Input>
>

export type FindBy<T> = (t: T) => boolean

export type Update<T> = DeepUpdate<T>
