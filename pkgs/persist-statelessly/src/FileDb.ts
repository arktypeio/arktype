import { deepMap, transform, Unlisted } from "@re-do/utils"
import { FileStore, FileStoreOptions } from "./FileStore"

export type Model = Record<string, Record<string, any>[]>

export type FileDb<T extends Model> = {
    [K in keyof T]: Interactions<Unlisted<T[K]>>
}

export type FileDbArgs<T extends Model> = FileStoreOptions<T> & {
    path: string
    fallback: T
}

export const createFileDb = <T extends Model>({
    fallback,
    ...rest
}: FileDbArgs<T>): FileDb<T> => {
    const store = new FileStore(fallback, {}, rest)
    return transform(fallback, ([k, v]) => [
        k,
        {
            persist: (o: any) => persist(k, o, store),
            retrieve: () => store.get(k as any)
        }
    ]) as any
}

const persist = <V extends Record<string, any>>(
    typeName: string,
    value: V,
    store: FileStore<any, {}>
) => {
    const id = 0
    const storedData = transform(value, ([k, v]) => {
        let storedValue = v
        if (v && typeof v === "object") {
            storedValue = Array.isArray(v)
                ? v.map((_) => persist(k, _, store))
                : persist(k, v, store)
        }
        return [k, storedValue]
    })
    store.update({
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
