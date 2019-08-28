import { Key, NonRecursible } from "@re-do/utils"
import { filter } from "./filter"

export type ExcludedByKeys<O, K extends Key[]> = Pick<
    O,
    Exclude<keyof O, K[number]>
>

export type DeepExcludedByKeys<O, K extends Key[]> = {
    [P in keyof ExcludedByKeys<O, K>]: O[P] extends NonRecursible | any[]
        ? O[P]
        : DeepExcludedByKeys<O[P], K>
}

export const excludeKeys = <O, K extends Key[], D extends boolean = false>(
    o: O,
    keys: K,
    deep?: D
) =>
    (filter(o, {
        objectFilter: ([k]) => !keys.includes(k),
        deep
    }) as any) as D extends true
        ? DeepExcludedByKeys<O, K>
        : ExcludedByKeys<O, K>
