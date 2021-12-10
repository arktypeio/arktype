import {
    NonRecursible,
    transform,
    Narrow,
    ListPossibleTypes,
    Merge,
    KeyValuate,
    narrow,
    WithDefaults
} from "@re-do/utils"
import {
    Parse,
    Validate,
    Definition,
    TypeSet,
    List,
    References
} from "@re-do/type"
import { Interactions } from "./interactions"

export type CompileStoredTypeSet<
    FullTypeSet,
    IdKey extends string,
    StoredTypeNames = string
> = {
    [TypeName in keyof FullTypeSet]: TypeName extends StoredTypeNames
        ? FullTypeSet[TypeName] & {
              [K in IdKey]: "number"
          }
        : FullTypeSet[TypeName]
}

export type ParseStoredType<
    Definition,
    StoredTypeSet,
    IdKey extends string
> = Parse<
    Definition,
    StoredTypeSet,
    {
        onCycle: { get: "()=>cyclic" } & {
            [K in IdKey]: "number"
        }
    }
>

export type CompileInputTypeSet<
    FullTypeSet,
    StoredTypeName,
    CustomInputs = {},
    InputDefinitions = Merge<FullTypeSet, CustomInputs>,
    DefinitionReferences = References<InputDefinitions>
> = CompileInputTypeSetRecurse<
    StoredTypeName,
    FullTypeSet,
    DefinitionReferences
>

export type CompileInputTypeSetRecurse<
    StoredTypeName,
    TypeDefinitions,
    DefinitionReferences
> = {
    [K in keyof TypeDefinitions]: TypeDefinitions[K] extends NonRecursible
        ? KeyValuate<DefinitionReferences, K> extends StoredTypeName
            ? `${TypeDefinitions[K] extends List.Definition
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
    Types extends TypeSet.Definition,
    ProvidedConfig extends StoreConfigOptions<Types> = {},
    Config extends StoreConfig<Types> = WithDefaults<
        StoreConfigOptions<Types>,
        ProvidedConfig,
        DefaultStoreConfig
    >,
    FullTypeSet = Types & Config["referencedTypes"],
    StoredTypeName = keyof Types & string,
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
    [TypeName in keyof Types]: Interactions<
        ParseStoredType<TypeName, StoredTypeSet, Config["idKey"]>,
        Parse<TypeName, InputTypeSet>
    >
}

export type StoreConfigOptions<T> = {
    idKey?: string
    inputs?: CustomInputDefinitions<T>
    referencedTypes?: TypeSet.Definition
}

const defaultStoreConfig = narrow({
    idKey: "id",
    inputs: {},
    referencedTypes: {}
})

export type DefaultStoreConfig = typeof defaultStoreConfig

export type StoreConfig<T> = Required<StoreConfigOptions<T>>

export const createStore = <
    Types extends TypeSet.Definition,
    ProvidedConfig extends StoreConfigOptions<Types> = {}
>(
    types: TypeSet.Validate<Types>,
    { inputs }: Narrow<StoreConfigOptions<Types>>
) => {
    const store = transform(types, ([typeName, definition]) => {
        return [typeName, definition]
    }) as Store<Types, ProvidedConfig>
    return store
}
