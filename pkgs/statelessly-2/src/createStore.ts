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
    DeepEvaluate
} from "@re-do/utils"
import {
    ParseType,
    TypeDefinition,
    TypeSet,
    ComponentTypesOfStringDefinition
} from "parsetype"
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
    A extends Actions<ConfigType> = {},
    StoredTypes = TypeNamesToResolverPaths<Config>
>(
    config: Narrow<Config>,
    options?: {
        predefined?: TypeSet<OptionsTypeSet>
        actions?: A
        reduxOptions?: ReduxOptions
    }
) => {
    return {} as DeepEvaluate<ConfigType>
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

export type Store<
    Data,
    Config,
    ConfigTypeSet,
    StoredTypes,
    IdKey extends string = "id",
    Path extends string = ""
> = {
    [K in keyof Data]: Data[K] extends NonRecursible
        ? Data[K]
        : K extends keyof Config
        ? InteractionsOrStore<
              Store<
                  Data[K],
                  Config[K],
                  ConfigTypeSet,
                  StoredTypes,
                  `${Path}/${K & Stringifiable}`,
                  IdKey
              >,
              "stores" extends keyof Config[K] ? true : false
          >
        : Data[K]
}

export type InteractionsOrStore<
    Input,
    IsStoredType extends boolean
> = IsStoredType extends true ? Interactions<Input> : Input

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
