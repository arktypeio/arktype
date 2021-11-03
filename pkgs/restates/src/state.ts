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
    WithReadonlyKeys,
    TransformCyclic,
    Cast
} from "@re-do/utils"
import {
    parse,
    ParsedType,
    ParseType,
    TypeDefinition,
    TypeSet,
    UnvalidatedDefinition,
    UnvalidatedTypeSet
} from "retypes"
// For some reason this prevents createState from giving an inane "cannot resolve type without reference" error
// import {} from "retypes/out/cjs/parse"
import {
    configureStore,
    ConfigureStoreOptions,
    Middleware,
    Store as ReduxStore
} from "@reduxjs/toolkit"
import {
    createMemoryDb,
    Interactions,
    StoreModel,
    UpdateFunction
} from "./store"

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

type GetDefinitions<Config, IdKey extends string> = IntersectProps<
    {
        [K in keyof Config]: IsAnyOrUnknown<Config[K]> extends false
            ? "defines" extends keyof Config[K]
                ? {
                      [DefinedType in Config[K]["defines"] &
                          string]: DefinitionFromField<Config[K], false>
                  }
                : "fields" extends keyof Config[K]
                ? NeverEmptyObject<GetDefinitions<Config[K]["fields"], IdKey>>
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

export type StateConfig<Config, ModelTypeSet, ModelType> = {
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

export const createState = <
    Config extends StateConfig<Config, StateTypeSet, StateType>,
    ExternalTypeSet = {},
    IdKey extends string = "id",
    StoredTypes = GetDefinitions<Config, IdKey>,
    StateTypeSet extends UnvalidatedTypeSet = Cast<
        ExternalTypeSet & StoredTypes,
        UnvalidatedTypeSet
    >,
    StateDefinition = DefinitionFromConfig<Config, true>,
    StateType = ParseType<
        StateDefinition,
        StateTypeSet,
        {
            onCycle: { get: "()=>cyclic" } & {
                [K in IdKey]: "number"
            }
        }
    >,
    StoredLocations = FilterByValue<
        Config,
        { stores: string } | { defines: string },
        { deep: true; replaceWith: true }
    >,
    A extends Actions<StateType> = {}
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
    const model = parse(modelTypeDef, { typeSet: modelTypeSet }) as any
    const initialState = model.getDefault() as StateType
    // copy the object by value
    const persisted = createMemoryDb(
        transform(storedPaths, ([i, v]) => [v, []])
    )
    // TODO: Require default value for stored type references
    const getStateProxy = (proxyTarget: any, path: string): any =>
        new Proxy(proxyTarget, {
            get: (target, prop) => {
                const pathToProp = path
                    ? `${path}/${String(prop)}`
                    : String(prop)

                if (!(prop in target)) {
                    return undefined
                }
                const value = target[prop]
                if (storedPaths.includes(pathToProp)) {
                    return {
                        create: (data: any) => {
                            const id = persisted.create({
                                typeName: pathToProp,
                                data
                            })
                            return { ...data, id }
                        },
                        all: () => persisted.all({ typeName: pathToProp })
                    }
                }
                if (isRecursible(value)) {
                    return getStateProxy(value, pathToProp)
                }
                return value
            },
            set: (target, prop, updatedValue) => {
                target[prop] = updatedValue
                return true
            }
        })
    const stateRoot = getStateProxy(initialState, "")
    return stateRoot as StoreModel<StateTypeSet> // State<StateType, StoredLocations, IdKey>
}

const compileModelTypeSet = (
    storedTypeSet: UnvalidatedTypeSet,
    externalTypeSet: UnvalidatedTypeSet,
    idKey: string
) => {
    const storedTypeSetWithIds = transform(
        storedTypeSet,
        ([typeName, definition]) => {
            if (
                typeof definition === "string" ||
                typeof definition === "number"
            ) {
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

const extractTypeDef = (config: any): any =>
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

// createTestState().cache.currentUser?.bestFriend?.get()

// createTestState().cache.currentCity.groups[0].members[0].bestFriend?.id

// export type State<Model, StoredLocations, IdKey extends string> = {
//     [K in keyof Model]: K extends keyof StoredLocations
//         ? StoredLocations[K] extends true
//             ? Interactions<Unlisted<Model[K]>, IdKey>
//             : State<Model[K], KeyValuate<StoredLocations[K], "fields">, IdKey>
//         : Model[K]
// }

export type Actions<Input> = Record<
    string,
    DeepUpdate<Input> | UpdateFunction<Input>
>

function createTestState() {
    return createState(
        {
            users: {
                defines: "user",
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
                    favoriteColor: "color",
                    address: {
                        fields: {
                            street: "string",
                            number: "number",
                            unit: "number?",
                            city: "city"
                        }
                    }
                }
            },
            groups: {
                defines: "group",
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
            nestedStore: {
                fields: {
                    colors: {
                        stores: "color"
                    },
                    others: {
                        defines: "other",
                        type: {
                            other: "string"
                        }
                    }
                }
            },
            preferences: {
                fields: {
                    darkMode: "boolean",
                    background: "color?",
                    font: {
                        fields: {
                            family: "string",
                            size: "number"
                        }
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
}
