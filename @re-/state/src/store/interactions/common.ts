import { DeepUpdate, DeepPartial } from "@re-/tools"
import { Space } from "@re-/model"
import { Db, DbContents } from "../db.js"
import { create } from "./create.js"
import { all } from "./all.js"
import { filter } from "./filter"

export type Interactions<Stored, Input> = {
    create: (data: Input) => Stored
    all: () => Stored[]
    find: (by: FindArgs<Stored>) => Stored
    filter: (by: FindArgs<Stored>) => Stored[]
    with: (by: FindArgs<Stored>) => {
        remove: () => Stored
        update: (update: DeepUpdate<Input>) => Stored
        upsert: (data: Input) => Stored
    }
    where: (by: FindArgs<Stored>) => {
        remove: () => Stored[]
        update: (update: DeepUpdate<Input>) => Stored[]
        upsert: (data: Input[]) => Stored[]
    }
}

export const getInteractions = <
    Stored,
    Input,
    Context extends InteractionContext
>(
    typeName: string,
    context: Context
): Partial<Interactions<Stored, Input>> => {
    return {
        all: () => all(typeName, context),
        create: (data) => create(typeName, data, context),
        filter: (by) => filter(typeName, by, context)
    }
}

export type InteractionContext<
    Stored extends DbContents<IdKey> = any,
    IdKey extends string = string
> = {
    db: Db<Stored, IdKey>
    idKey: IdKey
    model: Space<any, {}>
}

export type FindArgs<T> = DeepPartial<T> | ((t: T) => boolean)
