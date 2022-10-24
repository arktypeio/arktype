import type { Evaluate } from "./evaluate.js"

/** Either:
 * First, with all properties of Second as undefined
 * OR
 * Second, with all properties of First as undefined
 **/
export type MutuallyExclusiveProps<First, Second> =
    | Evaluate<First & { [K in keyof Second]?: undefined }>
    | Evaluate<Second & { [K in keyof First]?: undefined }>

export type ClassOf<Instance> = new (...constructorArgs: any[]) => Instance
export type InstanceOf<Class extends ClassOf<any>> = Class extends ClassOf<
    infer Instance
>
    ? Instance
    : never

export type Iterate<Next, Remaining extends unknown[]> = [Next, ...Remaining]

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

// Currently returns never if string and number keys of the same name are merged, e.g.:
// type Result = Merge<{1: false}, {"1": true}> //never
// This feels too niche to fix at the cost of performance and complexity, but that could change
// It also overrides values with undefined, unlike the associated function. We'll have to see if this is problematic.
export type Merge<Base, Merged> = Evaluate<
    Omit<ExtractMergeable<Base>, Extract<keyof Base, keyof Merged>> &
        ExtractMergeable<Merged>
>

type ExtractMergeable<T> = T extends {} ? T : {}
