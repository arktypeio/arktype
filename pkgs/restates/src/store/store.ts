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
    Cast
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
import { Db, StoredModel } from "./db.js"

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
    MergedDefinitions extends UnvalidatedTypeSet = MergeInputDefinitions<
        TypeSet,
        Provided
    >,
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
        | MergedDefinitions[TypeName] extends NonRecursible
        ? KeyValuate<
              DefinitionReferences,
              TypeName
          > extends keyof MergedDefinitions
            ? "number"
            : never
        : CompileInputTypeSetRecurse<
              MergedDefinitions[TypeName],
              KeyValuate<DefinitionReferences, TypeName>
          >
}

export type Interactions<
    TypeName extends keyof Model,
    Model extends StoreModel,
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

export type Store<Model extends StoreModel> = {
    [TypeName in keyof Model]: Interactions<TypeName, Model>
}

export type StoreModel<
    StoredTypeSet = ParsedTypeSet,
    InputTypeSet = ParsedTypeSet
> = {
    [K in keyof StoredTypeSet]: ModelType<
        StoredTypeSet[K],
        KeyValuate<InputTypeSet, K>
    >
}

export type ModelType<Stored = ParsedType, Input = ParsedType> = {
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
    Inputs extends CustomInputDefinitions<Types>,
    IdKey extends string = "id",
    StoredTypeSet = ParsedTypeSet<CompileStoredTypeSet<Types, IdKey>>,
    InputTypeSet = ParsedTypeSet<CompileInputTypeSet<Types, Inputs>>,
    Model extends StoreModel = Cast<
        StoreModel<StoredTypeSet, InputTypeSet>,
        StoreModel
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

export type ExtractStored<Model extends StoreModel> = {
    [TypeName in keyof Model]: Model[TypeName]["stored"]["type"]
}

export type InteractionContext<
    Model extends StoreModel,
    IdKey extends string,
    StoredType extends StoredModel<IdKey> = ExtractStored<Model>
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
