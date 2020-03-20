import moize from "moize"
import { isDeepStrictEqual } from "util"
import assert from "assert"
import deepMerge from "deepmerge"
export const merge = deepMerge
export const memoize = moize as <F extends (...args: any[]) => any>(f: F) => F

export type MapReturn<F, V> = F extends (value: V) => infer R ? R : any

export const isIn = (list: any[], value: any) => list.includes(value)

export type Class<T> = new (...args: any[]) => T

export type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends NonRecursible
        ? Required<T[P]>
        : DeepRequired<T[P]>
}

export const isEmpty = (value: object | any[]) =>
    isDeepStrictEqual(value, {}) || isDeepStrictEqual(value, [])

export type WithOptionalKeys<T extends object, Keys extends keyof T> = Omit<
    T,
    Keys
> &
    { [K in Keys]?: T[K] }

export type WithRequiredKeys<T extends object, Keys extends keyof T> = Omit<
    T,
    Keys
> &
    { [K in Keys]-?: T[K] }

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends NonRecursible ? T[P] : DeepPartial<T[P]>
}

export type ValueOf<T> = T[keyof T]
export type ValueFrom<T, K extends keyof T> = Pick<T, K>[K]

export type Primitive = string | number | boolean | symbol
export type NonRecursible = Primitive | Function | null | undefined
export type Unpromisified<T> = T extends Promise<infer U> ? U : never

export const isRecursible = (o: any) => o && typeof o === "object"

export const asserted = <T>(value: T, description?: string) => {
    assert(value, `'${value}' is not allowed as a ${description ?? "value"}.`)
    return value as NonNullable<T>
}

export const deepMap = (
    from: object | any[],
    map: (value: any) => any
): object =>
    fromEntries(
        Object.entries(from).map(([k, v]) => [
            k,
            isRecursible(v) ? deepMap(map(v), map) : map(v)
        ]),
        Array.isArray(from)
    )

export const transform = <K extends Key, V>(
    o: Record<K, V>,
    map: MapFunction<K, V>
) => {
    if (!o || typeof o !== "object") {
        throw new Error(`Can only transform objects. Received: ${o}.`)
    }
    return fromEntries(Object.entries(o).map(map as any)) as Record<K, V>
}

export type ItemOrList<T> = T | T[]
export type Unlisted<T> = T extends (infer V)[] ? V : T
export const listify = <T>(o: ItemOrList<T>) => ([] as T[]).concat(o)

export type Key = string | number
export type Entry = [Key, any]
export type MapFunction<K extends Key, V> = Parameters<Array<[K, V]>["map"]>[0]

export const fromEntries = (entries: Entry[], asArray = false) => {
    const obj: any = asArray ? [] : {}
    entries.forEach(([k, v]) => (obj[k] = v))
    return obj
}

export type SplitResult<T> = [T[], T[]]

export const split = <T>(list: T[], by: (item: T) => boolean) =>
    list.reduce(
        (sorted, item) =>
            (by(item)
                ? [[...sorted[0], item], sorted[1]]
                : [sorted[0], [...sorted[1], item]]) as SplitResult<T>,
        [[], []] as SplitResult<T>
    )

export type FilterUp<T, UpfilteredKey> = {
    [K in keyof T]: T[K] extends NonRecursible
        ? T[K]
        : Array<any> extends T[K]
        ?
              | Array<
                    FilterUp<
                        UpfilteredKey extends keyof Exclude<
                            Unlisted<T[K]>,
                            NonRecursible
                        >
                            ? Exclude<
                                  Unlisted<T[K]>,
                                  NonRecursible
                              >[UpfilteredKey]
                            : Exclude<Unlisted<T[K]>, NonRecursible>,
                        UpfilteredKey
                    >
                >
              | Extract<T[K], NonRecursible>
        :
              | FilterUp<
                    UpfilteredKey extends keyof Exclude<T[K], NonRecursible>
                        ? Exclude<T[K], NonRecursible>[UpfilteredKey]
                        : Exclude<T[K], NonRecursible>,
                    UpfilteredKey
                >
              | Extract<T[K], NonRecursible>
}
