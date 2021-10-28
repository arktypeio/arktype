import {
    NonRecursible,
    Unlisted,
    DeepUpdate,
    DeepPartial,
    transform
} from "@re-do/utils"
import { ParsedTypeSet, ParseType, UnvalidatedTypeSet } from "retypes"
import { Db, StoredModel } from "./db.js"

export type InputFor<Stored, IdKey extends string> =
    | Omit<
          {
              [K in keyof Stored]: Stored[K] extends NonRecursible
                  ? Stored[K]
                  : InputFor<Stored[K], IdKey>
          },
          IdKey
      >
    | (IdKey extends keyof Stored ? number : never)

export type DefaultInputs<Model extends UnvalidatedTypeSet> = {}

export type Interactions<
    T,
    IdKey extends string = "id",
    Stored = T,
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

export type Store<Model extends UnvalidatedTypeSet> = {
    [TypeName in keyof Model]: Interactions<ParseType<Model[TypeName], Model>>
}

export type StoreConfig<Model extends UnvalidatedTypeSet> = {
    model: Model
}

export const createStore = <Model extends UnvalidatedTypeSet>({
    model
}: StoreConfig<Model>) => {
    const store = transform(model, ([typeName, definition]) => {
        return [typeName, definition]
    }) as Store<Model>
    return store
}

export type InteractionContext<
    Model extends StoredModel<IdKey>,
    IdKey extends string,
    TypeSet extends UnvalidatedTypeSet
> = {
    db: Db<Model, IdKey>
    idKey: IdKey
    types: ParsedTypeSet<TypeSet>
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
