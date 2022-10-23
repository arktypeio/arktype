import type { Evaluate } from "./evaluate.js"

/** Either:
 * First, with all properties of Second as undefined
 * OR
 * Second, with all properties of First as undefined
 **/
export type MutuallyExclusiveProps<First, Second> =
    | Evaluate<First & { [K in keyof Second]?: undefined }>
    | Evaluate<Second & { [K in keyof First]?: undefined }>

export type IntersectionOf<Union> = (
    Union extends unknown ? (_: Union) => void : never
) extends (_: infer Intersection) => void
    ? Intersection
    : never

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

export type IsTopType<T> = (any extends T ? true : false) extends true
    ? true
    : false

export type IsAny<T> = (any extends T ? TopTypeIsAny<T> : false) extends true
    ? true
    : false

export type IsUnknown<T> = (
    any extends T ? TopTypeIsUnknown<T> : false
) extends true
    ? true
    : false

type TopTypeIsAny<T> = (T extends {} ? true : false) extends false
    ? false
    : true

type TopTypeIsUnknown<T> = (T extends {} ? true : false) extends false
    ? true
    : false

// @ts-expect-error
export type Get<T, K> = T[K]

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
