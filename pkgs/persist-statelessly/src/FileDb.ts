import { transform, Unlisted } from "@re-do/utils"
import { FileStore, FileStoreOptions } from "./FileStore"

export type Model = Record<string, Record<string, any>[]>

export type MappedKeys<T extends Model> = {
    [K in keyof T]?: { [K2 in keyof Unlisted<T[K]>]?: keyof T }
}

export type FileDb<T extends Model, IdFieldName extends string = "id"> = {
    [K in keyof T]: Interactions<Unlisted<T[K]>, IdFieldName>
}

export type FileDbArgs<T extends Model, IdFieldName extends string = "id"> =
    FileStoreOptions<T> & {
        fallback: T
        mappedKeys?: MappedKeys<T>
        idFieldName?: IdFieldName
    }

export const createFileDb = <
    T extends Model,
    IdFieldName extends string = "id"
>({
    fallback,
    mappedKeys = {},
    idFieldName,
    ...rest
}: FileDbArgs<T, IdFieldName extends undefined ? "id" : IdFieldName>): FileDb<
    T,
    IdFieldName extends undefined ? "id" : IdFieldName
> => {
    const store = new FileStore(fallback, {}, rest)
    return transform(fallback, ([k, v]) => [
        k,
        {
            create: (o: any) =>
                deepCreate(k, o, {
                    fallback,
                    store,
                    mappedKeys,
                    idFieldName: idFieldName ?? "id"
                }),
            find: () => store.get(k as any)
        }
    ]) as any
}

type FindBy<O extends object, IdFieldName extends string> = (o: O) => boolean

type Persisted<O extends object, IdFieldName extends string> = {
    [K in keyof O]: O[K] extends object ? number : O[K]
} &
    Record<IdFieldName extends string ? IdFieldName : never, number>

type Interactions<O extends object, IdFieldName extends string> = {
    create: (o: O) => Persisted<O, IdFieldName>
    find: (by: FindBy<O, IdFieldName>) => O[]
    findOne: (by: FindBy<O, IdFieldName>) => O
    findShallow: (
        by: FindBy<Persisted<O, IdFieldName>, IdFieldName>
    ) => Persisted<O, IdFieldName>[]
}

type FileDbContext = {
    fallback: Model
    store: FileStore<any, {}>
    mappedKeys: MappedKeys<any>
    idFieldName: string
}

const deepCreate = (typeName: string, value: any, context: FileDbContext) => {
    const storedData = transform(value, ([k, v]) => {
        if (k === context.idFieldName) {
            throw new Error(
                `The field name '${context.idFieldName}', found on ${typeName}, is not allowed.` +
                    `If you need to use it, provide a different name for statelessly to use via the 'idFieldName' option.`
            )
        }
        let storedValue = v
        if (v && typeof v === "object") {
            let keyName: string
            const possibleMappedKey = context.mappedKeys[typeName]?.[k]
            if (possibleMappedKey) {
                keyName = String(possibleMappedKey)
            } else if (k in context.fallback) {
                keyName = String(k)
            } else {
                throw new Error(
                    `Unable to determine entity associated with key '${k}' from type '${typeName}'.`
                )
            }
            storedValue = Array.isArray(v)
                ? v.map(
                      (_) =>
                          deepCreate(keyName, _, context)[context.idFieldName]
                  )
                : deepCreate(keyName, v, context)[context.idFieldName]
        }
        return [k, storedValue]
    })
    const existing = context.store.get(typeName) as Persisted<any, any>[]
    const storedDataWithId = {
        ...storedData,
        [context.idFieldName]:
            existing.reduce(
                (maxId, currentElement) =>
                    currentElement[context.idFieldName] > maxId
                        ? currentElement[context.idFieldName]
                        : maxId,
                0
            ) + 1
    }
    context.store.update({
        [typeName]: (_: any[]) => _.concat(storedDataWithId)
    } as any)
    return storedDataWithId
}

const shallowFind = (
    typeName: string,
    by: FindBy<any, any>,
    context: FileDbContext
) => {
    const existing = context.store.get(typeName) as object[]
    return existing.filter(by)
}

const unpackStoredValue = (
    typeName: string,
    o: Record<string, any>,
    context: FileDbContext
): any => {
    return transform(o, ([k, v]) => {
        let objectTypeName: string | undefined
        const possibleObjectTypeName = context.mappedKeys[typeName]?.[k]
        if (possibleObjectTypeName) {
            objectTypeName = String(possibleObjectTypeName)
        } else if (k in context.fallback) {
            objectTypeName = String(k)
        }
        if (objectTypeName) {
            const getUnpackedValue = (id: number) =>
                unpackStoredValue(
                    objectTypeName!,
                    shallowFind(
                        objectTypeName!,
                        (o) => o[context.idFieldName] === id,
                        context
                    ),
                    context
                )
            if (typeof v === "number") {
                return [k, getUnpackedValue(v)]
            } else if (
                Array.isArray(v) &&
                v.every((o) => typeof o === "number")
            ) {
                return [k, v.map((id) => getUnpackedValue(id))]
            }
        }
        return [k, v]
    })
}
