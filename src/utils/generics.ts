export type Narrow<T> = CastWithExclusion<T, NarrowRecurse<T>, []>

type NarrowRecurse<T> = {
    [K in keyof T]: T[K] extends Narrowable | [] ? T[K] : NarrowRecurse<T[K]>
}

type CastWithExclusion<T, CastTo, Excluded> = T extends Excluded ? T : CastTo

type Narrowable = string | boolean | number | bigint

/**
 * Note: Similarly to Narrow, trying to Evaluate 'unknown'
 * directly (i.e. not nested in an object) leads to the type '{}',
 * but I'm unsure how to fix this without breaking the types that rely on it.
 *
 */
export type Evaluate<T> = {
    [K in keyof T]: T[K]
} & unknown

// Currently returns never if string and number keys of the same name are merged, e.g.:
// type Result = Merge<{1: false}, {"1": true}> //never
// This feels too niche to fix at the cost of performance and complexity, but that could change.
// It also overrides values with undefined, unlike the associated function. We'll have to see if this is problematic.
export type Merge<Base, Merged> = Evaluate<
    Omit<ExtractMergeable<Base>, Extract<keyof Base, keyof Merged>> &
        ExtractMergeable<Merged>
>

type ExtractMergeable<T> = T extends {} ? T : {}

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

export type Dictionary<Of = unknown> = Record<string, Of>

export type ClassOf<Instance> = new (...constructorArgs: any[]) => Instance

export type InstanceOf<Class extends ClassOf<unknown>> = Class extends ClassOf<
    infer Instance
>
    ? Instance
    : never

export type Conform<T, Base> = T extends Base ? T : Base

export const isKeyOf = <k extends string | number, obj extends object>(
    k: k,
    obj: obj
): k is Extract<keyof obj, k> => k in obj

export type entryOf<o> = Evaluate<
    { [k in keyof o]: [k, o[k]] }[o extends unknown[]
        ? keyof o & number
        : keyof o] & {}
>

export type entriesOf<o extends object> = entryOf<o>[]

export const entriesOf = <o extends object>(o: o) =>
    Object.entries(o) as entriesOf<o>
