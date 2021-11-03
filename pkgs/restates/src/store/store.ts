import {
    NonRecursible,
    Unlisted,
    DeepUpdate,
    DeepPartial,
    transform,
    Narrow,
    ListPossibleTypes,
    Merge,
    KeyValuate,
    Cast,
    Evaluate
} from "@re-do/utils"
import {
    ParsedType,
    ParsedTypeSet,
    ParseType,
    TypeDefinition,
    TypeSet,
    UnvalidatedDefinition,
    UnvalidatedTypeSet
} from "retypes"
import { Db, DbContents } from "./db.js"

export type CompileStoredTypeSet<
    TypeSet extends UnvalidatedTypeSet,
    IdKey extends string
> = {
    [TypeName in keyof TypeSet]: TypeSet[TypeName] & { [K in IdKey]: number }
}

export type MergeInputDefinitions<
    TypeSet extends UnvalidatedTypeSet,
    Provided extends CustomInputDefinitions<TypeSet>
> = {
    [TypeName in keyof TypeSet]: Merge<TypeSet, Provided>
}

export type CompileInputTypeSet<
    TypeSet extends UnvalidatedTypeSet,
    Provided extends CustomInputDefinitions<TypeSet>,
    MergedDefinitions extends UnvalidatedTypeSet = Merge<TypeSet, Provided>,
    DefinitionReferences = TypeDefinition<
        MergedDefinitions,
        ListPossibleTypes<keyof MergedDefinitions>,
        { extractTypesReferenced: true }
    >
> = CompileInputTypeSetRecurse<MergedDefinitions, DefinitionReferences>

export type CompileInputTypeSetRecurse<
    MergedDefinitions,
    DefinitionReferences
> = {
    [TypeName in keyof MergedDefinitions]:
        | MergedDefinitions[TypeName]
        | (MergedDefinitions[TypeName] extends NonRecursible
              ? KeyValuate<
                    DefinitionReferences,
                    TypeName
                > extends keyof MergedDefinitions
                  ? "number"
                  : never
              : CompileInputTypeSetRecurse<
                    MergedDefinitions[TypeName],
                    KeyValuate<DefinitionReferences, TypeName>
                >)
}

export type SomeStoreModel = {
    [K in string]: ModeledType
}

export type Interactions<
    TypeName extends keyof Model & string = string,
    Model extends SomeStoreModel = SomeStoreModel,
    Input = Model[TypeName]["input"]["type"],
    Stored = Model[TypeName]["stored"]["type"]
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

export type CustomInputDefinitions<Model extends UnvalidatedTypeSet> = {
    [K in keyof Model]?: UnvalidatedDefinition
}

export type Store<Model extends SomeStoreModel> = {
    [TypeName in keyof Model & string]: Interactions<TypeName, Model>
}

export type StoreModel<
    Types extends UnvalidatedTypeSet = UnvalidatedTypeSet,
    Inputs extends CustomInputDefinitions<Types> = Types,
    IdKey extends string = "id",
    StoredTypeSet = ParsedTypeSet<CompileStoredTypeSet<Types, IdKey>>,
    InputTypeSet = ParsedTypeSet<CompileInputTypeSet<Types, Inputs>>
> = {
    [K in keyof StoredTypeSet & string]: ModeledType<
        StoredTypeSet[K],
        KeyValuate<InputTypeSet, K>
    >
}

export type ModeledType<Stored = ParsedType, Input = ParsedType> = {
    stored: Stored
    input: Input
}

export type StoreConfig<
    TypeSet extends UnvalidatedTypeSet,
    Inputs extends CustomInputDefinitions<TypeSet>
> = {
    inputs?: Inputs
}

export const createStore = <
    Types extends UnvalidatedTypeSet,
    Inputs extends CustomInputDefinitions<Types> = Types,
    IdKey extends string = "id",
    Model extends SomeStoreModel = Cast<
        StoreModel<Types, Inputs, IdKey>,
        SomeStoreModel
    >
>(
    types: TypeSet<Types>,
    { inputs }: Narrow<StoreConfig<Types, Inputs>>
) => {
    const store = transform(types, ([typeName, definition]) => {
        return [typeName, definition]
    }) as Store<Model>
    return store
}

export type ExtractStored<Model extends StoreModel<any>> = {
    [TypeName in keyof Model]: Model[TypeName]["stored"]["type"]
}

export type InteractionContext<
    Model extends StoreModel<any> = StoreModel<any>,
    IdKey extends string = "id",
    StoredType extends DbContents<IdKey> = ExtractStored<Model>
> = {
    db: Db<StoredType, IdKey>
    idKey: IdKey
    model: Model
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
