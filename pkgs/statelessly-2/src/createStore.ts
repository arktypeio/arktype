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
    filter,
    transform,
    isRecursible,
    DeepTreeOf,
    withDefaults,
    stringify,
    Key,
    WithReadonlyKeys
} from "@re-do/utils"
import {
    parse,
    ParseType,
    TypeDefinition,
    TypeSet,
    UnvalidatedDefinition,
    UnvalidatedTypeSet
} from "parsetype"
import {
    configureStore,
    ConfigureStoreOptions,
    Middleware,
    Store as ReduxStore
} from "@reduxjs/toolkit"
import { type } from "os"

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
    const {
        typeSet: externalTypeSet,
        actions,
        reduxOptions,
        idKey
    } = withDefaults({
        typeSet: {},
        actions: {},
        reduxOptions: {},
        idKey: "id"
    })(options)
    const modelTypeDef = extractTypeDef(config)
    const storedTypeSet = extractTypeSet(config, externalTypeSet)
    const modelTypeSet = compileModelTypeSet(
        storedTypeSet,
        externalTypeSet,
        idKey
    )
    const storedPaths = findStoredPaths(config, "")
    const model = parse(modelTypeDef, modelTypeSet)
    const initialState = model.getDefault()
    // copy the object by value
    const reduxStore = transform(initialState, ([k, v]) => [k, v], {
        deep: true
    })
    // TODO: Require default value for stored type references
    const getStoreProxy = (proxyTarget: any, path: string): any =>
        new Proxy(proxyTarget, {
            get: (target, prop) => {
                console.log(`Getting ${String(prop)} at ${path}`)
                if (!(prop in target)) {
                    return undefined
                }
                const value = target[prop]
                if (isRecursible(value)) {
                    return getStoreProxy(value, `${path}${String(prop)}/`)
                }
                return value
            },
            set: (target, prop, updatedValue) => {
                target[prop] = updatedValue
                return true
            }
        })
    const storeRoot = getStoreProxy(reduxStore, "")
    return storeRoot as Store<Model, StoredLocations, IdKey>
}

const compileModelTypeSet = (
    storedTypeSet: UnvalidatedTypeSet,
    externalTypeSet: UnvalidatedTypeSet,
    idKey: string
) => {
    const storedTypeSetWithIds = transform(
        storedTypeSet,
        ([typeName, definition]) => {
            if (typeof definition === "string") {
                throw new Error(`Stored type definitions must be objects.`)
            }
            return [typeName, { ...definition, [idKey]: "number" }]
        }
    )
    return { ...externalTypeSet, ...storedTypeSetWithIds }
}

const extractTypeSet = (
    config: any,
    externalTypeSet: UnvalidatedTypeSet
): UnvalidatedTypeSet =>
    Object.entries(config).reduce((typeSet, [k, v]) => {
        if (!isRecursible(v)) {
            return typeSet
        }
        if ("stores" in v) {
            if (!(v.stores in externalTypeSet)) {
                throw new Error(
                    `Stored type '${v.stores}' was not provided in your typeSet via options.` +
                        ` If you'd like to define it the config, use 'defines' instead of 'stores'.`
                )
            }
            return { ...typeSet, [v.stores]: externalTypeSet[v.stores] }
        }
        if ("defines" in v) {
            if ("type" in v) {
                return { ...typeSet, [v.defines]: v.type }
            }
            if ("fields" in v) {
                return { ...typeSet, [v.defines]: extractTypeDef(v.fields) }
            }
            throw new Error(
                `Stored type '${v.defines}' was specified via 'defines' but contains no definition.`
            )
        }
        if ("fields" in v) {
            return { ...typeSet, ...extractTypeSet(v.fields, externalTypeSet) }
        }
        return typeSet
    }, {} as UnvalidatedTypeSet)

const findStoredPaths = (config: any, path: string): string[] =>
    Object.entries(config).reduce((storedPaths, [k, v]) => {
        if (!isRecursible(v)) {
            return storedPaths
        }
        if ("stores" in v || "defines" in v) {
            return [...storedPaths, `${path}${k}`]
        }
        if ("fields" in v) {
            return [
                ...storedPaths,
                ...findStoredPaths(v.fields, `${path}${k}/`)
            ]
        }
        return storedPaths
    }, [] as string[])

const extractTypeDef = (config: any): DeepTreeOf<string> =>
    transform(config, ([k, v]) => {
        if (typeof v === "string") {
            return [k, v]
        }
        if (isRecursible(v)) {
            if ("stores" in v) {
                return [k, `${v.stores}[]`]
            }
            if ("defines" in v) {
                // Since we're extracting a typeDef, use the defined name
                // And let the typeSet figure out what the type should be
                return [k, `${v.defines}[]`]
            }
            if ("type" in v) {
                return [k, v.type]
            }
            if ("fields" in v) {
                return [k, extractTypeDef(v.fields)]
            }
        }
        // If we haven't already returned, subConfig has no types so don't include it
        return null
    })

export type Store<
    Model,
    StoredLocations,
    IdKey extends string
> = WithReadonlyKeys<
    {
        [K in keyof Model]: K extends keyof StoredLocations
            ? StoredLocations[K] extends true
                ? Interactions<Model[K], IdKey>
                : Store<
                      Model[K],
                      KeyValuate<StoredLocations[K], "fields">,
                      IdKey
                  >
            : Model[K]
    },
    keyof StoredLocations & keyof Model
>

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
