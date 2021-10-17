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
    Or,
    DeepExcludedByKeys,
    Not,
    FilterByValue,
    Entry,
    PropertyOf,
    ExcludeNever,
    NeverEmptyObject,
    Iteration,
    IntersectProps,
    DeepPartial,
    filter
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

type GetStoredTypes<Config, IdKey extends string> = IntersectProps<
    {
        [K in keyof Config]: IsAnyOrUnknown<Config[K]> extends false
            ? "defines" extends keyof Config[K]
                ? {
                      [DefinedType in Config[K]["defines"] &
                          string]: DefinitionFromField<Config[K], false> &
                          {
                              [K in IdKey]: "number"
                          }
                  }
                : "stores" extends keyof Config[K]
                ? {
                      [StoredType in Config[K]["stores"] & string]: {
                          [K in IdKey]: "number"
                      }
                  }
                : "fields" extends keyof Config[K]
                ? NeverEmptyObject<GetStoredTypes<Config[K]["fields"], IdKey>>
                : never
            : never
    }
>

type UntypedConfigError = "Unable to infer config type."

type DefinitionFromConfig<Config, UseDefinedTypeNames extends boolean> = {
    [K in keyof Config]: DefinitionFromField<Config[K], UseDefinedTypeNames>
}

type DefinitionFromField<
    Config,
    UseDefinedTypeNames extends boolean
> = IsAnyOrUnknown<Config> extends true
    ? never
    : Config extends string
    ? Config
    : And<
          UseDefinedTypeNames,
          "defines" extends keyof Config ? true : false
      > extends true
    ? `${KeyValuate<Config, "defines"> & string}[]`
    : "stores" extends keyof Config
    ? `${KeyValuate<Config, "stores"> & string}[]`
    : "type" extends keyof Config
    ? Config["type"]
    : "fields" extends keyof Config
    ? DefinitionFromConfig<Config["fields"], UseDefinedTypeNames>
    : UntypedConfigError

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
    InStoredType extends boolean,
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
          InStoredType,
          Seen,
          Path,
          ModelTypeSet,
          DeclaredTypeNames
      >

type ModelConfigOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InStoredType extends boolean,
    Seen,
    Path extends Segment[],
    ModelTypeSet,
    DeclaredTypeNames extends string[]
> = ModelConfigBaseOptions<T, Config> &
    ModelTypeOptions<
        T,
        Config,
        PathToType,
        InStoredType,
        Path,
        ModelTypeSet,
        DeclaredTypeNames
    > &
    ModelConfigFieldOptions<
        T,
        Config,
        PathToType,
        InStoredType,
        Seen,
        Path,
        ModelTypeSet,
        DeclaredTypeNames
    > &
    StoredModelConfigOptions<
        T,
        Config,
        PathToType,
        InStoredType,
        Seen,
        DeclaredTypeNames
    >

type ModelConfigBaseOptions<T, Config> = {
    validate?: (value: T) => boolean
    onChange?: (updates: T) => void
}

type ModelTypeOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InStoredType extends boolean,
    Path extends Segment[],
    ModelTypeSet,
    DeclaredTypeNames extends string[],
    TypeDef = {
        type: TypeDefinition<KeyValuate<Config, "type">, DeclaredTypeNames>
    },
    StoresDef = {
        stores: keyof ModelTypeSet
    }
> = PathToType extends null
    ? "stores" extends keyof Config
        ? StoresDef
        : "fields" extends keyof Config
        ? Partial<TypeDef>
        : TypeDef
    : {}

type ConfigIfRecursible<T, Seen, ValueIfRecursible> = Unlisted<T> extends
    | NonRecursible
    | Seen
    ? {}
    : ValueIfRecursible

type StoredModelConfigOptions<
    T,
    Config,
    PathToType,
    InStoredType extends boolean,
    Seen,
    DeclaredTypeNames extends string[]
> = And<PathToType extends null ? true : false, Not<InStoredType>> extends true
    ? {
          defines?: string
      }
    : {}

type ModelConfigFieldOptions<
    T,
    Config,
    PathToType extends Segment[] | null,
    InStoredType extends boolean,
    Seen,
    Path extends Segment[],
    ModelTypeSet,
    DeclaredTypeNames extends string[],
    ConfigFields = "fields" extends keyof Config ? Config["fields"] : never,
    ConfigHasKey extends Record<"type" | "stores" | "defines", boolean> = {
        type: "type" extends keyof Config ? true : false
        stores: "stores" extends keyof Config ? true : false
        defines: "defines" extends keyof Config ? true : false
    },
    DefinitionIsHere extends boolean = Or<
        ConfigHasKey["type"],
        ConfigHasKey["stores"]
    >,
    StoredTypeIsHere extends boolean = Or<
        ConfigHasKey["stores"],
        ConfigHasKey["defines"]
    >
> = ConfigIfRecursible<
    T,
    Seen,
    {
        fields?: {
            [K in keyof Unlisted<T>]?: K extends keyof ConfigFields
                ? ModelConfigRecurse<
                      KeyValuate<Unlisted<T>, K>,
                      ConfigFields[K],
                      DefinitionIsHere extends true ? Path : PathToType,
                      StoredTypeIsHere extends true ? true : InStoredType,
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
    ExternalTypeSet = {},
    IdKey extends string = "id",
    StoredTypes = GetStoredTypes<Config, IdKey>,
    ModelTypeSet = ExternalTypeSet & StoredTypes,
    ModelDefinition = DefinitionFromConfig<Config, true>,
    Model = ParseType<ModelDefinition, ModelTypeSet>,
    StoredLocations = FilterByValue<
        Config,
        { stores: string } | { defines: string },
        { deep: true; replaceWith: true }
    >,
    A extends Actions<Model> = {}
>(
    config: Narrow<Config>,
    options?: {
        typeSet?: Narrow<ExternalTypeSet>
        actions?: A
        reduxOptions?: ReduxOptions
        idKey?: IdKey
    }
) => {
    const modelTypeSet = filter(config, { deep: true })
    const getStoreProxy = (): any =>
        new Proxy({}, { get: () => getStoreProxy() })
    const store = getStoreProxy()
    return store as Store<Model, StoredLocations, IdKey>
}

export type Store<Model, StoredLocations, IdKey extends string> = {
    [K in keyof Model]: K extends keyof StoredLocations
        ? StoredLocations[K] extends true
            ? Interactions<Model[K], IdKey>
            : Store<Model[K], KeyValuate<StoredLocations[K], "fields">, IdKey>
        : Model[K]
}

type InputFor<Stored, IdKey extends string> =
    | Omit<
          {
              [K in keyof Stored]: Stored[K] extends NonRecursible
                  ? Stored[K]
                  : InputFor<Stored[K], IdKey>
          },
          IdKey
      >
    | (IdKey extends keyof Stored ? number : never)

export type Interactions<
    Model,
    IdKey extends string,
    Stored = Unlisted<Model>,
    Input = InputFor<Stored, IdKey>
> = {
    create: (data: Input) => Stored
    all: () => Stored[]
    find: (by: FindArgs<Stored>) => Stored
    filter: (by: FindArgs<Stored>) => Stored[]
    with: (by: FindArgs<Stored>) => {
        remove: () => Stored
        update: (update: DeepUpdate<Input>) => Stored
    }
    where: (by: FindArgs<Stored>) => {
        remove: () => Stored[]
        update: (update: DeepUpdate<Input>) => Stored[]
    }
}

export type UpdateFunction<Input> = (
    args: any,
    context: any
) => DeepUpdate<Input> | Promise<DeepUpdate<Input>>

export type Actions<Input> = Record<
    string,
    DeepUpdate<Input> | UpdateFunction<Input>
>

export type FindArgs<T> = DeepPartial<T> | ((t: T) => boolean)

export type FindFunction<T, Multiple extends boolean> = <
    Args extends FindArgs<T>
>(
    args: Args
) => Multiple extends true ? T[] : T

export type FilterFunction<T> = <Args extends FindArgs<T>>(args: Args) => T[]
