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
    ValueOf
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

type StoredTypesToDefinitionPaths<Config> = FromEntries<
    ListPossibleTypes<TypeNamesToResolverPathsRecurse<Config, "">>
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
    StoredTypeResolutions = StoredTypesToDefinitionPaths<Config>,
    StoredTypeSet = CompileStoredTypeSet<
        RawModelDefinition,
        StoredTypeResolutions
    >,
    ProvidedTypeSet = {},
    FullTypeSet = ProvidedTypeSet & StoredTypeSet,
    ModelDefinition = DefinitionFromConfig<Config, true>,
    Model = ParseType<ModelDefinition, FullTypeSet>,
    DeclaredTypeNames extends string[] = ListPossibleTypes<keyof FullTypeSet>,
    Resolutions = ResolvedConfigPaths<
        RawModelDefinition,
        StoredTypeResolutions,
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
    return {} as Evaluate<Resolutions>
    // Store<ModelDefinition, StoredTypeSet, ProvidedTypeSet>
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
                currentUser: "user",
                currentCity: "city"
            }
        }
    },
    { typeSet: { city: { users: "user[]", groups: "group[]" } } }
)

// Even if type isn't in config, need to follow a "types" path so it can e.g. go from
// a type from options typeset back to a stored type from config which allows us to infer
// IDs should be added

export type Store<
    ModeledType,
    ModelTypeDef,
    StoredTypeSet,
    FullTypeSet,
    DeclaredTypeNames extends string[] = ListPossibleTypes<keyof FullTypeSet>
> = {
    [K in keyof ModeledType]: {}
}

export type StoreRecurse<
    ModeledType,
    ModeledTypeDef,
    StoredTypeSet,
    FullTypeSet,
    DeclaredTypeNames extends string[]
> = {
    [K in keyof ModeledType]: K extends keyof ModeledTypeDef
        ? {}
        : InvalidPropertyError<ModeledTypeDef, K>
}

export type NextStorePath<
    Path extends string,
    K extends string,
    PathReferencingStored extends string,
    CandidatePath extends string = `${Path}${K}`
> = CandidatePath extends PathReferencingStored ? "" : CandidatePath

export type InteractionsOrStoreForKey<
    K extends keyof Data,
    Data,
    Config,
    FullTypeSet,
    ConfigRoot,
    StoredTypeResolutions,
    Path extends string,
    Resolved extends boolean,
    ResolvePath = KeyValuate<StoredTypeResolutions, Path>
> = {}

type ResolvedConfigPathsRecurse<
    DeepConfigTypeNames,
    Path extends string,
    StoredTypeResolutions,
    DeepProvidedTypeNames
> = {
    [K in keyof DeepConfigTypeNames]: DeepConfigTypeNames[K] extends string
        ? DeepConfigTypeNames[K] extends keyof StoredTypeResolutions
            ? [
                  `${Path}${K & string}`,
                  StoredTypeResolutions[DeepConfigTypeNames[K]]
              ]
            : DeepConfigTypeNames[K] extends keyof DeepProvidedTypeNames
            ? ResolvedConfigPathsRecurse<
                  DeepProvidedTypeNames[DeepConfigTypeNames[K]],
                  `${Path}${K & string}/`,
                  StoredTypeResolutions,
                  DeepProvidedTypeNames
              >
            : never
        : ResolvedConfigPathsRecurse<
              DeepConfigTypeNames[K],
              `${Path}${K & string}/`,
              StoredTypeResolutions,
              DeepProvidedTypeNames
          >
}[keyof DeepConfigTypeNames]

type ResolvedConfigPaths<
    RawModelDefinition,
    ResolverPaths,
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
                ResolverPaths,
                TypeDefinition<
                    ProvidedTypeSet,
                    DeclaredTypeNames,
                    { extractBaseNames: true }
                >
            >
        >
    >
>

export type Interactions<Input, Stored = Input> = {
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
