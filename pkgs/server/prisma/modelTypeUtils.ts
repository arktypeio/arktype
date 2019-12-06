type PrismaCreationType = {
    create?: object
    connect?: object
}
type Unprismafy<T extends object> = {
    [K in keyof T]: T[K] extends object ? Unprismafy<T[K] extends PrismaCreationType ? T[K]["create"] : T[K]> : T[K]
}
type Key = string | number
type Primitive = string | number | boolean | symbol
type NonRecursible = Primitive | Function | null | undefined
type ExcludedByKeys<O, K extends Key[]> = Pick<
    O,
    Exclude<keyof O, K[number]>
>
type DeepExcludedByKeys<O, K extends Key[]> = {
    [P in keyof ExcludedByKeys<O, K>]: O[P] extends NonRecursible | any[]
    ? O[P]
    : DeepExcludedByKeys<O[P], K>
}

