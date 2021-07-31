import { DeepUpdate, transform, Unlisted } from "@re-do/utils"
import { FileStore, FileStoreOptions } from ".."
import {
    Model,
    Data,
    InteractionOptions,
    Relationships,
    FileDbContext,
    FindBy,
    ShallowModel,
    ReuseExisting
} from "./common.js"
import { createDependentsMap } from "./relationships.js"
import { create, CreateOptions } from "./create.js"
import { remove, RemoveOptions } from "./remove.js"
import { find } from "./find.js"
import { update } from "./update.js"

export type FileDbArgs<
    T extends Model,
    IdFieldName extends string = "id"
> = FileStoreOptions<ShallowModel<T, IdFieldName>> & {
    relationships: Relationships<T>
    idFieldName?: IdFieldName
    reuseExisting?: ReuseExisting<T>
}

export const createFileDb = <
    T extends Model,
    IdFieldName extends string = "id"
>({
    relationships,
    idFieldName,
    reuseExisting,
    ...fileStoreOptions
}: FileDbArgs<T, IdFieldName extends undefined ? "id" : IdFieldName>): FileDb<
    T,
    IdFieldName extends undefined ? "id" : IdFieldName
> => {
    const store = new FileStore<ShallowModel<T, IdFieldName>, {}>(
        {},
        fileStoreOptions as any
    )
    const context: FileDbContext<T> = {
        store,
        relationships,
        dependents: createDependentsMap(relationships),
        idFieldName: idFieldName ?? "id",
        reuseExisting: reuseExisting ?? {}
    }
    const interactions = transform(relationships, ([k, v]) => {
        const key = String(k)
        return [
            k,
            {
                create: (o: any, options?: CreateOptions<any>) =>
                    create(key, o, context, options),
                all: (options: InteractionOptions<any> = {}) =>
                    find(key, (_) => true, context, {
                        unpack: options.unpack ?? true,
                        exactlyOne: false
                    }),
                find: (by: FindBy<T>, options: InteractionOptions<any> = {}) =>
                    find(key, by, context, { unpack: options.unpack ?? true }),
                filter: (
                    by: FindBy<T>,
                    options: InteractionOptions<any> = {}
                ) =>
                    find(key, by, context, {
                        unpack: options.unpack ?? true,
                        exactlyOne: false
                    }),
                remove: (by: FindBy<T>, options: RemoveOptions = {}) =>
                    remove(key, by, context, options),
                update: (where: FindBy<T>, changes: DeepUpdate<T>) =>
                    update(key, where, changes, context)
            }
        ]
    }) as any
    return {
        ...interactions,
        all: () => store.getState()
    }
}

export type FileDb<T extends Model, IdFieldName extends string = "id"> = {
    all: () => ShallowModel<T, IdFieldName>
} & {
    [K in keyof T]: Interactions<Unlisted<T[K]>, IdFieldName>
}

export type Interactions<O extends object, IdFieldName extends string> = {
    create: <U extends boolean = true>(
        o: O,
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>
    all: <U extends boolean = true>(
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>[]
    find: <U extends boolean = true>(
        by: FindBy<Data<O, IdFieldName, U>>,
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>
    filter: <U extends boolean = true>(
        by: FindBy<Data<O, IdFieldName, U>>,
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>[]
    remove: <U extends boolean = true>(
        by: FindBy<Data<O, IdFieldName, U>>,
        options?: RemoveOptions
    ) => void
    update: (
        by: FindBy<Data<O, IdFieldName, false>>,
        update: DeepUpdate<Data<O, IdFieldName, false>>
    ) => void
}
