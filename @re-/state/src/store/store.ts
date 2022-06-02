import {
    NonRecursible,
    transform,
    Narrow,
    Merge,
    KeyValuate,
    narrow,
    WithDefaults,
    Evaluate
} from "@re-/tools"
import {
    TypeOf,
    Definition,
    ReferencesOf,
    SpaceResolutions,
    ValidateSpaceResolutions,
    compile
} from "@re-/model"
import {
    getInteractions,
    InteractionContext,
    Interactions
} from "./interactions"
import { createMemoryDb, Db } from "./db.js"

export type CompileStoredTypeSet<
    FullTypeSet,
    IdKey extends string,
    StoredTypeNames = string
> = {
    [TypeName in keyof FullTypeSet]: TypeName extends StoredTypeNames
        ? Evaluate<
              FullTypeSet[TypeName] & {
                  [K in IdKey]: "number"
              }
          >
        : FullTypeSet[TypeName]
}

export type ParseStoredType<
    Definition,
    StoredTypeSet,
    IdKey extends string
> = TypeOf<
    Definition,
    StoredTypeSet,
    {
        onCycle: { get: "()=>cyclic" } & {
            [K in IdKey]: "number"
        }
    }
>

export type CompileInputTypeSet<
    Resolutions,
    StoredTypeName,
    CustomInputs = {},
    InputDefinitions = Merge<Resolutions, CustomInputs>,
    DefinitionReferences = ReferencesOf<InputDefinitions, Resolutions>
> = CompileInputTypeSetRecurse<
    StoredTypeName,
    Resolutions,
    DefinitionReferences
>

export type CompileInputTypeSetRecurse<
    StoredTypeName,
    TypeDefinitions,
    DefinitionReferences
> = {
    [K in keyof TypeDefinitions]: TypeDefinitions[K] extends NonRecursible
        ? KeyValuate<DefinitionReferences, K> extends StoredTypeName
            ? `${TypeDefinitions[K] extends `${string}[]`
                  ? "number[]"
                  : "number"}|${TypeDefinitions[K] & string}`
            : TypeDefinitions[K]
        : CompileInputTypeSetRecurse<
              StoredTypeName,
              TypeDefinitions[K],
              KeyValuate<DefinitionReferences, K>
          >
}

export type CustomInputDefinitions<Types> = {
    [K in keyof Types]?: Definition
}

export type Store<
    Resolutions extends SpaceResolutions,
    ProvidedConfig extends StoreConfigOptions<Resolutions> = {},
    Config extends StoreConfig<Resolutions> = WithDefaults<
        StoreConfigOptions<Resolutions>,
        ProvidedConfig,
        // @ts-ignore
        DefaultStoreConfig
    >,
    FullTypeSet = Resolutions & Config["referencedTypes"],
    StoredTypeName = keyof Resolutions & string,
    StoredTypeSet = CompileStoredTypeSet<
        FullTypeSet,
        Config["idKey"],
        StoredTypeName
    >,
    InputTypeSet = CompileInputTypeSet<
        FullTypeSet,
        StoredTypeName,
        Config["inputs"]
    >
> = {
    [TypeName in keyof Resolutions]: Interactions<
        ParseStoredType<TypeName, StoredTypeSet, Config["idKey"]>,
        TypeOf<TypeName, InputTypeSet>
    >
}

export type StoreConfigOptions<T> = {
    db?: Db<any, any, any>
    idKey?: string
    inputs?: CustomInputDefinitions<T>
    referencedTypes?: SpaceResolutions
}

const defaultStoreConfig = narrow({
    idKey: "id",
    inputs: {},
    referencedTypes: {}
})

export type DefaultStoreConfig = typeof defaultStoreConfig

export type StoreConfig<T> = Omit<Required<StoreConfigOptions<T>>, "db">

type CreateStore = <
    Types extends SpaceResolutions,
    ProvidedConfig extends StoreConfigOptions<Types> = {}
>(
    types: Narrow<ValidateSpaceResolutions<Types>>,
    options?: Narrow<StoreConfigOptions<Types>>
) => Store<Types, ProvidedConfig>

export const createStore: CreateStore = (types, options = {}) => {
    const context = {
        db:
            options.db ??
            createMemoryDb(
                // @ts-ignore
                transform(types, ([typeName, definition]) => {
                    return [typeName, []]
                }),
                { idKey: options.idKey }
            ),
        idKey: options.idKey ?? "id",
        // @ts-ignore
        model: compile(types)
    }
    const store = transform(types, ([typeName, definition]) => {
        // @ts-ignore
        return [typeName, getInteractions(typeName as string, context)]
    })
    return store as any
}
