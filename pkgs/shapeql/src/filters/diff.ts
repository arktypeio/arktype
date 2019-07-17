import { isDeepStrictEqual } from "util"
import { isRecursible, fromEntries, DeepPartial } from "redo-utils"

const diffable = (o: any) => isRecursible(o) && !Array.isArray(o)

export const diff = <T>(original: T, updated: T): DeepPartial<T> =>
    fromEntries(Object.entries(updated)
        .filter(
            ([k]) =>
                !isDeepStrictEqual(
                    original[k as keyof T],
                    updated[k as keyof T]
                )
        )
        .map(([k]) => {
            return [
                k,
                diffable(original[k as keyof T]) &&
                diffable(updated[k as keyof T])
                    ? diff(original[k as keyof T], updated[k as keyof T])
                    : updated[k as keyof T]
            ]
        }) as any) as DeepPartial<T>
