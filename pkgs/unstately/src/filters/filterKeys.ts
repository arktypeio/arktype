import { Key, NonRecursible } from "@re-do/utils"
import { filter } from "./filter"

export type FilteredByKeys<O, K extends Key[]> = Pick<
    O,
    Extract<keyof O, K[number]>
>

export type DeepFilteredByKeys<O, K extends Key[]> = {
    [P in keyof FilteredByKeys<O, K>]: O[P] extends NonRecursible | any[]
        ? O[P]
        : DeepFilteredByKeys<O[P], K>
}

export const filterKeys = <O, K extends Key[], D extends boolean = false>(
    o: O,
    keys: K,
    deep?: D
) =>
    (filter(o, {
        objectFilter: ([k]) => keys.includes(k),
        deep
    }) as any) as D extends true
        ? DeepFilteredByKeys<O, K>
        : FilteredByKeys<O, K>
