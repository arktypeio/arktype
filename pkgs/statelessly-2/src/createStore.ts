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
    Recursible,
    IsAnyOrUnknown,
    InvalidPropertyError,
    Evaluate,
    DeepUpdate,
    And,
    ValueOf,
    DeepEvaluate,
    Or
} from "@re-do/utils"
import { ParseType, TypeDefinition, TypeSet } from "parsetype"
import {
    configureStore,
    ConfigureStoreOptions,
    Middleware,
    Store as ReduxStore
} from "@reduxjs/toolkit"
import { UnvalidatedObjectDefinition } from "../node_modules/parsetype/dist/cjs/common.js"

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

type DefinitionFromConfig<Config, UseStoredTypes extends boolean> = {
    [K in keyof Config]: DefinitionsFromField<Config[K], UseStoredTypes>
}

type LeafOf<Obj, LeafType = NonRecursible> = Obj extends LeafType
    ? Obj
    : Obj extends NonRecursible
    ? never
    : ValueOf<
          {
              [K in keyof Obj]: LeafOf<Obj[K], LeafType>
          }
      >

type UntypedConfigError = "Unable to infer config type."

type DefinitionsFromField<
    Config,
    UseStoredTypes extends boolean,
    DefinitionsFromNested = "fields" extends keyof Config
        ? DefinitionFromConfig<Config["fields"], UseStoredTypes>
        : UntypedConfigError
> = IsAnyOrUnknown<Config> extends true
    ? never
    : Config extends string
    ? Config
    : And<
          Or<
              UseStoredTypes,
              LeafOf<DefinitionsFromNested, string> extends UntypedConfigError
                  ? true
                  : false
          >,
          "stores" extends keyof Config ? true : false
      > extends true
    ? `${KeyValuate<Config, "stores"> & string}[]`
    : "type" extends keyof Config
    ? Config["type"]
    : DefinitionsFromNested

type ResolveStoredType<
    TypeName extends keyof StoredTypesToPaths,
    RawModelDefinition,
    StoredTypesToPaths,
    ExternalTypeSet,
    RawStoredTypeDefinition = ValueAtPath<
        RawModelDefinition,
        StoredTypesToPaths[TypeName] & string
    >
> = RawStoredTypeDefinition extends `${TypeName & string}[]`
    ? TypeName extends keyof ExternalTypeSet
        ? ExternalTypeSet[TypeName]
        : `Unknown stored type '${TypeName &
              string}'. Either specify a type in its config or add it to your typeSet.`
    : RawStoredTypeDefinition

type EnsureObjectDefinition<Definition> =
    Definition extends UnvalidatedObjectDefinition
        ? Definition
        : `Stored types must resolve to object definitions. Found '${Definition &
              string}'.`

type TypeSetFromConfig<
    RawModelDefinition,
    StoredTypesToPaths,
    ExternalTypeSet
> = Evaluate<
    {
        [TypeName in keyof StoredTypesToPaths]: EnsureObjectDefinition<
            ResolveStoredType<
                TypeName,
                RawModelDefinition,
                StoredTypesToPaths,
                ExternalTypeSet
            > & { id: "number" }
        >
    } &
        {
            [ExternalTypeName in Exclude<
                keyof ExternalTypeSet,
                keyof StoredTypesToPaths
            >]: ExternalTypeSet[ExternalTypeName]
        }
>

export type StoreConfig<Config, ModelTypeSet, ModelType> = {
    [K in keyof Config]: ValidatedConfig<
        Config[K],
        ModelConfigRecurse<
            KeyValuate<ModelType, K>,
            Config[K],
            null,
            false,
            never,
            [K & Segment],
            ModelTypeSet,
            ListPossibleTypes<keyof ModelTypeSet & string>
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
    ModelTypeSet,
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
          ModelTypeSet,
          DeclaredTypeNames
      >

type ModelConfigOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InResolver extends boolean,
    Seen,
    Path extends Segment[],
    ModelTypeSet,
    DeclaredTypeNames extends string[]
> = ModelConfigBaseOptions<T, Config> &
    ModelTypeOptions<
        T,
        Config,
        PathToType,
        InResolver,
        Path,
        ModelTypeSet,
        DeclaredTypeNames
    > &
    ModelConfigFieldOptions<
        T,
        Config,
        PathToType,
        InResolver,
        Seen,
        Path,
        ModelTypeSet,
        DeclaredTypeNames
    > &
    ModelConfigDefinitionOptions<T, Config, InResolver, Seen, DeclaredTypeNames>

type ModelConfigBaseOptions<T, Config> = {
    validate?: (value: T) => boolean
    onChange?: (updates: T) => void
}

type ModelTypeOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InResolver extends boolean,
    Path extends Segment[],
    ModelTypeSet,
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
    ModelTypeSet,
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
                      ModelTypeSet,
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
    Config extends StoreConfig<Config, ModelTypeSet, Model>,
    RawModelDefinition = DefinitionFromConfig<Config, false>,
    StoredTypesToPaths = GetStoredTypesToPaths<Config>,
    ExternalTypeSet = {},
    ModelTypeSet = TypeSetFromConfig<
        RawModelDefinition,
        StoredTypesToPaths,
        ExternalTypeSet
    >,
    ModelDefinition = DefinitionFromConfig<Config, true>,
    Model = ParseType<ModelDefinition, ModelTypeSet>,
    A extends Actions<Model> = {}
>(
    config: Narrow<Config>,
    options?: {
        typeSet?: Narrow<ExternalTypeSet>
        actions?: A
        reduxOptions?: ReduxOptions
    }
) => {
    return {} as Store<Model, StoredTypesToPaths>
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
                    onChange: () => {}
                },
                bestFriend: "user?",
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
                    stores: "color"
                }
            }
        },
        cache: {
            fields: {
                currentUser: "user|null",
                currentCity: "city",
                lastObject: "user|group?",
                cityOrUser: "user|city"
            }
        }
    },
    {
        typeSet: {
            city: {
                users: "user[]",
                groups: "group[]",
                adjacentCities: "city[]"
            },
            color: {
                RGB: "string"
            }
        }
    }
)

export type Store<Model, StoredTypesToPaths, Path extends string = ""> = {
    [K in keyof Model]: `${Path}${K &
        string}` extends ValueOf<StoredTypesToPaths>
        ? Interactions<Model[K]>
        : Model[K] extends NonRecursible
        ? Model[K]
        : Store<Model[K], StoredTypesToPaths, `${Path}${K & string}/`>
}

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
