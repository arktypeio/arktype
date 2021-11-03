import { NonRecursible, CastWithExclusion } from "./common"

export type NarrowRecurse<T> = {
    [K in keyof T]: T[K] extends NonRecursible ? T[K] : NarrowRecurse<T[K]>
}

export type Narrow<T> = CastWithExclusion<T, NarrowRecurse<T>, []>

export const narrow = <T>(arg: Narrow<T>) => arg as T
