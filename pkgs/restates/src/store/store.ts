import {
    NonRecursible,
    DeepUpdate,
    DeepPartial,
    transform,
    Narrow,
    ListPossibleTypes,
    Merge,
    KeyValuate,
    narrow,
    WithDefaults
} from "@re-do/utils"
import {
    ParsedTypeSet,
    ParseType,
    TypeDefinition,
    TypeSet,
    UnvalidatedDefinition,
    UnvalidatedTypeSet
} from "retypes"
import { Db, DbContents } from "./db.js"

export type CompileStoredTypeSet<
    FullTypeSet,
    IdKey extends string,
    StoredTypeNames = string
> = {
    [TypeName in keyof FullTypeSet]: TypeName extends StoredTypeNames
        ? FullTypeSet[TypeName] &
              {
                  [K in IdKey]: number
              }
        : FullTypeSet[TypeName]
}

export type ParseStoredType<
    Definition,
    StoredTypeSet,
    IdKey extends string
> = ParseType<
    Definition,
    StoredTypeSet,
    {
        onCycle: { get: "()=>cyclic" } & {
            [K in IdKey]: "number"
        }
    }
>

export type ParseInputType<Definition, InputTypeSet> = ParseType<
    Definition,
    InputTypeSet
>

export type CompileInputTypeSet<
    FullTypeSet,
    StoredTypeName,
    CustomInputs = {},
    InputDefinitions = Merge<FullTypeSet, CustomInputs>,
    DefinitionReferences = TypeDefinition<
        InputDefinitions,
        ListPossibleTypes<keyof InputDefinitions>,
        { extractTypesReferenced: true }
    >
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
            ? `number|${TypeDefinitions[K] & string}`
            : TypeDefinitions[K]
        : CompileInputTypeSetRecurse<
              StoredTypeName,
              TypeDefinitions[K],
              KeyValuate<DefinitionReferences, K>
          >
}

export type Interactions<Stored, Input> = {
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

export type CustomInputDefinitions<Types> = {
    [K in keyof Types]?: UnvalidatedDefinition
}

export type Store<
    Types extends UnvalidatedTypeSet,
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
        ParseInputType<TypeName, InputTypeSet>
    >
}

export type StoreConfigOptions<T> = {
    idKey?: string
    inputs?: CustomInputDefinitions<T>
    referencedTypes?: UnvalidatedTypeSet
}

const defaultStoreConfig = narrow({
    idKey: "id",
    inputs: {},
    referencedTypes: {}
})

export type DefaultStoreConfig = typeof defaultStoreConfig

export type StoreConfig<T> = Required<StoreConfigOptions<T>>

export const createStore = <
    Types extends UnvalidatedTypeSet,
    ProvidedConfig extends StoreConfigOptions<Types> = {}
>(
    types: TypeSet<Types>,
    { inputs }: Narrow<StoreConfigOptions<Types>>
) => {
    const store = transform(types, ([typeName, definition]) => {
        return [typeName, definition]
    }) as Store<Types, ProvidedConfig>
    return store
}

export type InteractionContext<
    Stored extends DbContents<IdKey>,
    IdKey extends string
> = {
    db: Db<Stored, IdKey>
    idKey: IdKey
    model: ParsedTypeSet
}

export type UpdateFunction<Input> = (
    args: any,
    context: any
) => DeepUpdate<Input> | Promise<DeepUpdate<Input>>

export type FindArgs<T> = DeepPartial<T> | ((t: T) => boolean)

export type FindFunction<T, Multiple extends boolean> = <
    Args extends FindArgs<T>
>(
    args: Args
) => Multiple extends true ? T[] : T

export type FilterFunction<T> = <Args extends FindArgs<T>>(args: Args) => T[]
