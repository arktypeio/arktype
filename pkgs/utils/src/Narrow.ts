import { NonRecursible, IfExtends } from "./common"

type NarrowRecurse<T> = {
    [K in keyof T]: T[K] extends NonRecursible ? T[K] : NarrowRecurse<T[K]>
}

export type Narrow<T> = IfExtends<T, [], T, NarrowRecurse<T>>
