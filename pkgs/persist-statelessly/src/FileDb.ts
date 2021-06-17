import { transform, Unlisted } from "@re-do/utils"
import { FileStore, FileStoreOptions } from "./FileStore"

export type Model = Record<string, object[]>

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
            persist: (o: object) =>
                store.update({
                    [k]: (_: object[]) => _.concat(o)
                } as any),
            retrieve: () => store.get(k as any)
        }
    ]) as any
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
