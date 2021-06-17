import { deepMap, Key, transform, Unlisted } from "@re-do/utils"
import { FileStore, FileStoreOptions } from "./FileStore"

export type Model = Record<string, Record<string, any>[]>

export type MappedKeys<T extends Model> = {
    [K in keyof T]?: { [K2 in keyof Unlisted<T[K]>]?: keyof T }
}

export type FileDb<T extends Model> = {
    [K in keyof T]: Interactions<Unlisted<T[K]>>
}

export type FileDbArgs<T extends Model> = FileStoreOptions<T> & {
    fallback: T
    mappedKeys?: MappedKeys<T>
}

export const createFileDb = <T extends Model>({
    fallback,
    mappedKeys = {},
    ...rest
}: FileDbArgs<T>): FileDb<T> => {
    const store = new FileStore(fallback, {}, rest)
    return transform(fallback, ([k, v]) => [
        k,
        {
            persist: (o: any) => persist(k, o, { fallback, store, mappedKeys }),
            retrieve: () => store.get(k as any)
        }
    ]) as any
}

type PersistContext = {
    fallback: Model
    store: FileStore<any, {}>
    mappedKeys: MappedKeys<any>
}

const persist = (typeName: string, value: any, context: PersistContext) => {
    const id = 0
    const storedData = transform(value, ([k, v]) => {
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
                ? v.map((_) => persist(keyName, _, context))
                : persist(keyName, v, context)
        }
        return [k, storedValue]
    })
    context.store.update({
        [typeName]: (_: any[]) => _.concat({ id, ...storedData })
    } as any)
    return id
}

type Persisted<O extends object> = {
    [K in keyof O]: O[K] extends object ? number : O[K]
} & {
    id: number
}

type Interactions<O extends object> = {
    persist: (o: O) => Persisted<O>
    retrieve: () => O[]
}
