import { NonRecursible, CastWithExclusion } from "./common"

type NarrowRecurse<T> = {
    [K in keyof T]: T[K] extends NonRecursible ? T[K] : NarrowRecurse<T[K]>
}

export type Narrow<T> = CastWithExclusion<T, NarrowRecurse<T>, []>
