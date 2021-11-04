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
    UnvalidatedTypeSet,
    ParseTypeSet
} from "retypes"
import { Db, DbContents } from "./db.js"

type SelfReference<Definitions> = {
    [TypeName in keyof Definitions]: TypeName
}

export type CompileStoredTypes<
    Types,
    ExternalTypeSet,
    IdKey extends string,
    StoredTypeSet = {
        [TypeName in keyof Types]: Types[TypeName] &
            {
                [K in IdKey]: number
            }
    },
    MergedTypeSet = StoredTypeSet & ExternalTypeSet
> = ParseType<SelfReference<StoredTypeSet>, MergedTypeSet>

export type CompileInputTypes<
    Types,
    ExternalTypeSet,
    CustomInputs = {},
    InputTypes = Merge<Types, CustomInputs>,
    MergedTypes = InputTypes & ExternalTypeSet,
    DefinitionReferences = TypeDefinition<
        MergedTypes,
        ListPossibleTypes<keyof MergedTypes>,
        { extractTypesReferenced: true }
    >,
    MergedInputTypeSet = CompileInputTypeSetRecurse<
        keyof InputTypes,
        MergedTypes,
        DefinitionReferences
    >
> = ParseType<SelfReference<InputTypes>, MergedInputTypeSet>

export type CompileInputTypeSetRecurse<
    InputTypeName,
    TypeDefinitions,
    DefinitionReferences
> = {
    [K in keyof TypeDefinitions]: TypeDefinitions[K] extends NonRecursible
        ? KeyValuate<DefinitionReferences, K> extends InputTypeName
            ? `number|${TypeDefinitions[K] & string}`
            : TypeDefinitions[K]
        : CompileInputTypeSetRecurse<
              InputTypeName,
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
    StoredTypes = CompileStoredTypes<
        Types,
        Config["referencedTypes"],
        Config["idKey"]
    >,
    InputTypes = CompileInputTypes<
        Types,
        Config["referencedTypes"],
        Config["inputs"]
    >
> = {
    [K in keyof Types]: Interactions<
        KeyValuate<StoredTypes, K>,
        KeyValuate<InputTypes, K>
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
