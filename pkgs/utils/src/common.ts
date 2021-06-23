import moize from "moize"
import isDeepEqual from "fast-deep-equal"
import deepMerge from "deepmerge"
import { Object as O } from "ts-toolbelt"

export const merge = deepMerge
export const memoize = moize as <F extends (...args: any[]) => any>(f: F) => F
export const deepEquals = isDeepEqual

export type Merge<
    A extends object,
    B extends object,
    C extends object = {},
    D extends object = {},
    E extends object = {},
    F extends object = {},
    G extends object = {}
> = O.Assign<A, [B, C, D, E, F, G]>

export type MapReturn<F, V> = F extends (value: V) => infer R ? R : any

export const isIn = (list: any[], value: any) => list.includes(value)

export type Class<T> = new (...args: any[]) => T

export type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends NonRecursible
        ? Required<T[P]>
        : DeepRequired<T[P]>
}

export const isEmpty = (value: object | any[]) =>
    deepEquals(value, {}) || deepEquals(value, [])

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

export type Writeable<T> = { -readonly [P in keyof T]: T[P] }
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> }

export type ValueOf<T> = T[keyof T]
export type ValueFrom<T, K extends keyof T> = Pick<T, K>[K]

export type Primitive = string | number | boolean | symbol
export type NonRecursible = Primitive | Function | null | undefined
export type Unpromisified<T> = T extends Promise<infer U> ? U : never

export const isRecursible = (o: any) => o && typeof o === "object"

export const asserted = <T>(value: T, description?: string) => {
    if (!value) {
        throw Error(`'${value}' is not allowed as a ${description ?? "value"}.`)
    }
    return value as NonNullable<T>
}

export const deepMap = <T>(from: T, map: (entry: Entry) => any): T =>
    fromEntries(
        Object.entries(from).map(([k, v]) =>
            map([k, isRecursible(v) ? deepMap(v, map) : v])
        ),
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
export type FilterByValue<T extends object, ValueType> = Pick<
    T,
    {
        [K in keyof T]: T[K] extends ValueType ? K : never
    }[keyof T]
>
export type ExcludeByValue<T extends object, ValueType> = Pick<
    T,
    {
        [K in keyof T]: T[K] extends ValueType ? never : K
    }[keyof T]
>
export type OptionalOnly<T extends object> = Pick<
    T,
    {
        [K in keyof T]: undefined extends T[K] ? K : never
    }[keyof T]
>

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

export const withDefaults =
    <T extends Record<string, any>>(defaults: Required<OptionalOnly<T>>) =>
    (provided: T) => {
        return { ...defaults, ...provided }
    }
