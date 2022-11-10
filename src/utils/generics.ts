export type narrow<t> = castWithExclusion<t, narrowRecurse<t>, []>

type narrowRecurse<t> = {
    [k in keyof t]: t[k] extends Narrowable | [] ? t[k] : narrowRecurse<t[k]>
}

type castWithExclusion<t, castTo, excluded> = t extends excluded ? t : castTo

type Narrowable = string | boolean | number | bigint

/**
 * Note: Similarly to Narrow, trying to Evaluate 'unknown'
 * directly (i.e. not nested in an object) leads to the type '{}',
 * but I'm unsure how to fix this without breaking the types that rely on it.
 *
 */
export type evaluate<t> = {
    [k in keyof t]: t[k]
} & unknown

// Currently returns never if string and number keys of the same name are merged, e.g.:
// type Result = Merge<{1: false}, {"1": true}> //never
// This feels too niche to fix at the cost of performance and complexity, but that could change.
// It also overrides values with undefined, unlike the associated function. We'll have to see if this is problematic.
export type merge<base, merged> = evaluate<
    Omit<extractMergeable<base>, Extract<keyof base, keyof merged>> &
        extractMergeable<merged>
>

type extractMergeable<t> = t extends {} ? t : {}

export type isTopType<t> = (any extends t ? true : false) extends true
    ? true
    : false

export type isAny<t> = (any extends t ? topTypeIsAny<t> : false) extends true
    ? true
    : false

export type isUnknown<t> = (
    any extends t ? topTypeIsUnknown<t> : false
) extends true
    ? true
    : false

type topTypeIsAny<t> = (t extends {} ? true : false) extends false
    ? false
    : true

type topTypeIsUnknown<t> = (t extends {} ? true : false) extends false
    ? true
    : false

export type conform<t, base> = t extends base ? t : base

export const isKeyOf = <k extends string | number, obj extends object>(
    k: k,
    obj: obj
): k is Extract<keyof obj, k> => k in obj

export type entryOf<o> = { [k in keyof o]: [k, o[k]] }[o extends unknown[]
    ? keyof o & number
    : keyof o]

export type entriesOf<o extends object> = entryOf<o>[]

export const entriesOf = <o extends object>(o: o) =>
    Object.entries(o) as entriesOf<o>

export type keysOf<o extends object> = (keyof o)[]

export const keysOf = <o extends object>(o: o) => Object.keys(o) as keysOf<o>

export type keySet<key extends string = string> = Record<key, true>

export type keyOrSet<key extends string = string> = key | keySet<key>

export type partialKeySet<key extends string = string> = { [_ in key]?: true }

export type keyOrPartialSet<key extends string = string> =
    | key
    | partialKeySet<key>

export type mutable<o> = {
    -readonly [k in keyof o]: o[k]
}

export type subtype<t, u extends t> = u

export type defined<t> = Exclude<t, undefined>

export type requireKeys<o, key extends keyof o> = o & {
    [requiredKey in key]-?: o[requiredKey]
}

export type maybePush<MaybeArray, T> = MaybeArray extends unknown[]
    ? [...MaybeArray, T]
    : T

export type partialRecord<k extends string, v> = { [_ in k]?: v }

export const satisfies =
    <base>() =>
    <t extends base>(t: t) =>
        t
