import { DeepUpdate, transform, Unlisted } from "@re-do/utils"
import { FileStore, FileStoreOptions } from ".."
import {
    Model,
    Data,
    InteractionOptions,
    Relationships,
    FileDbContext,
    FindBy,
    ShallowModel
} from "./common"
import { createDependentsMap } from "./relationships"
import { create, CreateOptions } from "./create"
import { remove, RemoveOptions } from "./remove"
import { find } from "./find"
import { update } from "./update"

export type FileDbArgs<
    T extends Model,
    IdFieldName extends string = "id"
> = FileStoreOptions<ShallowModel<T, IdFieldName>> & {
    relationships: Relationships<T>
    idFieldName?: IdFieldName
}

export const createFileDb = <
    T extends Model,
    IdFieldName extends string = "id"
>({
    relationships,
    idFieldName,
    ...fileStoreOptions
}: FileDbArgs<T, IdFieldName extends undefined ? "id" : IdFieldName>): FileDb<
    T,
    IdFieldName extends undefined ? "id" : IdFieldName
> => {
    const store = new FileStore<ShallowModel<T, IdFieldName>>(
        {},
        fileStoreOptions
    )
    const context: FileDbContext<T> = {
        store,
        relationships,
        dependents: createDependentsMap(relationships),
        idFieldName: idFieldName ?? "id"
    }
    const interactions = transform(relationships, ([k, v]: [string, any]) => [
        k,
        {
            create: (o: any, options?: CreateOptions<any>) =>
                create(k, o, context, options),
            all: (options: InteractionOptions<any> = {}) =>
                find(k, (_) => true, context, {
                    unpack: options.unpack ?? true,
                    exactlyOne: false
                }),
            find: (by: FindBy<T>, options: InteractionOptions<any> = {}) =>
                find(k, by, context, { unpack: options.unpack ?? true }),
            filter: (by: FindBy<T>, options: InteractionOptions<any> = {}) =>
                find(k, by, context, {
                    unpack: options.unpack ?? true,
                    exactlyOne: false
                }),
            remove: (by: FindBy<T>, options: RemoveOptions = {}) =>
                remove(k, by, context, options),
            update: (where: FindBy<T>, changes: DeepUpdate<T>) =>
                update(k, where, changes, context)
        }
    ]) as any
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
