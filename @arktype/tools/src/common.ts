import type { Evaluate } from "./evaluate.js"

export type WithPropValue<Obj, Prop extends string | number, Value> = Evaluate<
    Omit<Obj, Prop> & { [K in Prop]: Value }
>

export type Dictionary<PropType = unknown> = Record<string, PropType>

export type ElementOf<T extends List> = T extends List<infer Item>
    ? Item
    : never

export type ValueOf<T> = T extends List<infer Item> ? Item : T[keyof T]

export type Entry<K extends Key = Key, V = unknown> = [K, V]

export type Entries<K extends Key = Key, V = unknown> = Entry<K, V>[]

export type EntryOf<T> = { [K in keyof T]: [K, T[K]] }[T extends unknown[]
    ? keyof T & number
    : keyof T]

export type EntriesOf<T> = EntryOf<T>[]

export type Fn<Parameters extends any[] = any[], ReturnType = unknown> = (
    ...args: Parameters
) => ReturnType

export type Primitive = string | number | boolean | symbol | bigint
export type NonObject = Primitive | null | undefined | void
export type NonRecursible = NonObject | Fn
export type Recursible<T> = T extends NonRecursible ? never : T

export const isRecursible = <O>(
    o: O
): o is IsUnknown<Recursible<O>> extends true
    ? O & Record<Key, unknown>
    : Recursible<O> => typeof o === "object" && o !== null

/** Either:
 * First, with all properties of Second as undefined
 * OR
 * Second, with all properties of First as undefined
 **/
export type MutuallyExclusiveProps<First, Second> =
    | Evaluate<First & { [K in keyof Second]?: undefined }>
    | Evaluate<Second & { [K in keyof First]?: undefined }>

export type ArrayMethodParams<Element = unknown> = [
    element: Element,
    index: number,
    context: Element[]
]

export type MapFn<In = unknown> = <Out>(...args: ArrayMethodParams<In>) => Out

export type FilterFn<In = unknown> = (...args: ArrayMethodParams<In>) => boolean

export type IntersectionOf<Union> = (
    Union extends unknown ? (_: Union) => void : never
) extends (_: infer Intersection) => void
    ? Intersection
    : never

export type Key = string | number | symbol

export type ClassOf<Instance> = new (...constructorArgs: any[]) => Instance
export type InstanceOf<Class extends ClassOf<any>> = Class extends ClassOf<
    infer Instance
>
    ? Instance
    : never

export type Iterate<Next, Remaining extends unknown[]> = [Next, ...Remaining]

export type IterateType<T, Next extends T, Remaining extends T[]> = [
    Next,
    ...Remaining
]

export type IsAnyOrUnknown<T> = (any extends T ? true : false) extends true
    ? true
    : false

export type IsAny<T> = (any extends T ? AnyIsAny<T> : false) extends true
    ? true
    : false

export type IsUnknown<T> = (
    any extends T ? AnyIsUnknown<T> : false
) extends true
    ? true
    : false

type AnyIsAny<T> = (T extends {} ? true : false) extends false ? false : true

type AnyIsUnknown<T> = (T extends {} ? true : false) extends false
    ? true
    : false

// @ts-ignore
export type Get<T, K> = T[K]

export type List<T = unknown> = T[] | readonly T[]

export type GetRequiredKeys<O> = {
    [K in keyof O]-?: {} extends Pick<O, K> ? never : K
}[keyof O]

export type GetOptionalKeys<O> = {
    [K in keyof O]-?: {} extends Pick<O, K> ? K : never
}[keyof O]

export type RequireKeys<O, KeysToMakeRequired extends keyof O> = O & {
    [K in KeysToMakeRequired]-?: Exclude<O[K], undefined>
}

export type OptionalizeKeys<O, KeysToMakeOptional extends keyof O> = Omit<
    O,
    KeysToMakeOptional
> & {
    [K in KeysToMakeOptional]-?: O[K]
}

export type Stringifiable =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined

export type CastWithExclusion<T, CastTo, Excluded> = T extends Excluded
    ? T
    : CastTo

export type Conform<T, Base> = T extends Base ? T : Base

/**
 *  Check if T is exactly identical to U.
 *  Can be used to distinguish any/unknown/never from more precise types,
 *  but will return false when comparing any of those types to themselves.
 */
export type IsExactly<T, U> = T extends U
    ? unknown extends T
        ? false
        : true
    : false

export const pathAdd = (...subpaths: (string | number)[]) =>
    subpaths.filter((_) => _ !== "").join("/")
