import { DeepUpdate, DeepPartial } from "@re-do/utils"
import { create } from "./create.js"
import { CompiledTypeSet } from "@re-do/type"
import { Db, DbContents } from "../db.js"

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
        create: (data) => create(typeName, data, context)
    }
}

export type InteractionContext<
    Stored extends DbContents<IdKey> = any,
    IdKey extends string = string
> = {
    db: Db<Stored, IdKey>
    idKey: IdKey
    model: CompiledTypeSet<any>
}

export type FindArgs<T> = DeepPartial<T> | ((t: T) => boolean)
