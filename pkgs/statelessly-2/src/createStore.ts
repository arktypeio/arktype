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
    valueAtPath
} from "@re-do/utils"
import {
    ParseType,
    TypeDefinition,
    TypeSet,
    ComponentTypesOfStringDefinition
} from "parsetype"
// As of TS 4.5.0-beta, this is required to avoid TS2742
import { StringDefinition } from "parsetype/dist/cjs/definitions"
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

type TypeNamesToResolverPaths<Config> = FromEntries<
    ListPossibleTypes<TypeNamesToResolverPathsRecurse<Config, "">>
>

/**
 * Create an entry whose key represents a path whose type is resolved from the config
 * to the path at which it is resolved. Will return never for built-in types (e.g. string)
 * or types that are defined in the options typeset.
 **/
type PathResolutionEntry<
    TypeDef extends string,
    Path extends string,
    ResolverPaths,
    DeclaredTypeNames extends string[],
    BaseTypes = ComponentTypesOfStringDefinition<TypeDef, DeclaredTypeNames>
> = BaseTypes extends keyof ResolverPaths
    ? [Path, ResolverPaths[BaseTypes]]
    : never

type ResolvedConfigPathsRecurse<
    TypeDef,
    Path extends string,
    ResolverPaths,
    DeclaredTypeNames extends string[]
> = Evaluate<
    {
        [K in keyof TypeDef]: TypeDef[K] extends string
            ? PathResolutionEntry<
                  TypeDef[K],
                  `${Path}${K & string}`,
                  ResolverPaths,
                  DeclaredTypeNames
              >
            : ResolvedConfigPathsRecurse<
                  TypeDef[K],
                  `${Path}${K & string}/`,
                  ResolverPaths,
                  DeclaredTypeNames
              >
    }[keyof TypeDef]
>

type ResolvedConfigPaths<
    Config,
    TypeDef = TypeDefFromConfig<Config>,
    ResolverPaths = TypeNamesToResolverPaths<Config>,
    DeclaredTypeNames extends string[] = ListPossibleTypes<keyof ResolverPaths>
> = FromEntries<
    ListPossibleTypes<
        ResolvedConfigPathsRecurse<
            TypeDef,
            "",
            ResolverPaths,
            DeclaredTypeNames
        >
    >
>

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
> = Evaluate<
    {
        [TypeName in keyof DefinedTypes]: ValueAtPath<
            TypeDef,
            DefinedTypes[TypeName] & string
        >
    }
>

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

export type ReduxOptions = Omit<
    ConfigureStoreOptions,
    "preloadedState" | "reducer"
>

export const createStore = <
    Config extends ModelConfig<Config, ConfigTypeSet, ConfigType>,
    OptionsTypeSet = {},
    ConfigTypeSet = OptionsTypeSet & TypeSetFromConfig<Config>,
    ConfigType = TypeFromConfig<Config, ConfigTypeSet>,
    StoredTypeResolutions = ResolvedConfigPaths<Config>,
    A extends Actions<ConfigType> = {}
>(
    config: Narrow<Config>,
    options?: {
        predefined?: TypeSet<OptionsTypeSet>
        actions?: A
        reduxOptions?: ReduxOptions
    }
) => {
    return {} as Store<
        ConfigType,
        Config,
        ConfigTypeSet,
        Config,
        StoredTypeResolutions,
        "",
        false
    >
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
            currentUser: "user"
        }
    }
})

// Even if type isn't in config, need to follow a "types" path so it can e.g. go from
// a type from options typeset back to a stored type from config which allows us to infer
// IDs should be added

export type Store<
    Data,
    Config,
    ConfigTypeSet,
    ConfigRoot,
    StoredTypeResolutions,
    Path extends string,
    Resolved extends boolean
> = Evaluate<
    {
        [K in keyof Data]: Data[K] extends NonRecursible
            ? Data[K]
            : InteractionsOrStoreForKey<
                  K,
                  Data,
                  Config,
                  ConfigTypeSet,
                  ConfigRoot,
                  StoredTypeResolutions,
                  `${Path}/${K & string}`,
                  Resolved
              >
    }
>

export type InteractionsOrStoreForKey<
    K extends keyof Data,
    Data,
    Config,
    ConfigTypeSet,
    ConfigRoot,
    StoredTypeResolutions,
    Path extends string,
    Resolved extends boolean,
    ResolvePath = KeyValuate<StoredTypeResolutions, Path>
> = "stores" extends keyof Config
    ? Interactions<Data[K]>
    : Store<
          Data[K],
          ResolvePath extends string
              ? ValueAtPath<ConfigRoot, ResolvePath>
              : KeyValuate<Config, K>,
          ConfigTypeSet,
          ConfigRoot,
          StoredTypeResolutions,
          Path,
          Resolved | ResolvePath extends string ? true : false
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
