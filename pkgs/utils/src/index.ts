import moize from "moize"
import { classToPlain, plainToClass } from "class-transformer"

export const objectify = classToPlain
export const classify = plainToClass

export type Shape = object

export const memoize = moize as <F extends (...args: any[]) => any>(f: F) => F

export type MapReturn<F, V> = F extends (value: V) => infer R ? R : any

export type Class<T> = new (...args: any[]) => T

export type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends NonRecursible
        ? Required<T[P]>
        : DeepRequired<T[P]>
}

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends NonRecursible ? T[P] : DeepPartial<T[P]>
}

export type ValueOf<T> = T[keyof T]
export type ValueFrom<T, K extends keyof T> = Pick<T, K>[K]

export type Primitive = string | number | boolean | symbol
export type NonRecursible = Primitive | Function | null | undefined
export const isRecursible = (o: any) => o && typeof o === "object"

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

export type ItemOrList<T> = T | T[]
export type Unlisted<T> = T extends (infer V)[] ? V : T
export const listify = <T>(o: ItemOrList<T>) => ([] as T[]).concat(o)

export type Key = string | number
export type Entry = [Key, any]

export const fromEntries = (entries: Entry[], asArray = false) => {
    const obj: any = asArray ? [] : {}
    entries.forEach(([k, v]) => (obj[k] = v))
    return obj
}
