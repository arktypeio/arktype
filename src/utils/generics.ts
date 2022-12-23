import { hasDomain } from "./domains.js"

export type downcast<t> = castWithExclusion<t, downcastRecurse<t>, []>

type downcastRecurse<t> = {
    [k in keyof t]: t[k] extends Downcastable | []
        ? t[k]
        : downcastRecurse<t[k]>
}

type castWithExclusion<t, castTo, excluded> = t extends excluded ? t : castTo

export type Downcastable = string | boolean | number | bigint

/**
 * Note: Similarly to downcast, trying to evaluate 'unknown'
 * directly (i.e. not nested in an object) leads to the type '{}',
 * but I'm unsure how to fix this without breaking the types that rely on it.
 */
export type evaluate<t> = {
    [k in keyof t]: t[k]
} & unknown

// Currently returns never if string and number keys of the same name are merged, e.g.:
// type Result = Merge<{1: false}, {"1": true}> //never
// This feels too niche to fix at the cost of performance and complexity, but that could change.
// It also overrides values with undefined, unlike the associated function. We'll have to see if this is problematic.
export type merge<base, merged> = evaluate<
    Omit<conform<base, {}>, Extract<keyof base, keyof merged>> &
        conform<merged, {}>
>

/** Replace existing keys of o without altering readonly or optional modifiers  */
export type replaceKeys<
    o,
    replacements extends { -readonly [k in keyof o]?: unknown }
> = evaluate<{
    [k in keyof o]: k extends keyof replacements ? replacements[k] : o[k]
}>

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

export type NonEmptyList<t = unknown> = readonly [t, ...t[]]

export type conform<t, base> = t extends base ? t : base

export const isKeyOf = <k extends string | number, obj extends object>(
    k: k,
    obj: obj
): k is Extract<keyof obj, k> => k in obj

export type classOf<instanceType> = new (
    ...constructorArgs: any[]
) => instanceType

export type instanceOf<classType extends classOf<any>> =
    classType extends classOf<infer Instance> ? Instance : never

export type entryOf<o> = { [k in keyof o]-?: [k, o[k]] }[o extends List
    ? keyof o & number
    : keyof o]

export type entriesOf<o extends object> = entryOf<o>[]

export const entriesOf = <o extends object>(o: o) =>
    Object.entries(o) as entriesOf<o>

export type keysOf<o extends object> = (keyof o)[]

export const keysOf = <o extends object>(o: o) => Object.keys(o) as keysOf<o>

export const hasKey = <o, k extends string>(
    o: o,
    k: k
): o is Extract<o, { [_ in k]: {} }> => {
    const valueAtKey = (o as any)?.[k]
    return valueAtKey !== undefined && valueAtKey !== null
}

export const keyCount = (o: object) => Object.keys(o).length

export type keySet<key extends string = string> = { readonly [_ in key]?: true }

export const hasKeys = (value: unknown) =>
    hasDomain(value, "object") ? Object.keys(value).length !== 0 : false

export type mutable<o> = {
    -readonly [k in keyof o]: o[k]
}

export type immutable<o> = {
    readonly [k in keyof o]: o[k]
}

export type deepImmutable<o> = [o] extends [object]
    ? {
          readonly [k in keyof o]: deepImmutable<o[k]>
      }
    : o

export type equals<t, u> = identity<t> extends identity<u> ? true : false

export type identity<t> = (_: t) => t

export type extend<t, u extends t> = u

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type subsume<t extends u, u> = u

export type defined<t> = Exclude<t, undefined>

export type requireKeys<o, key extends keyof o> = o & {
    [requiredKey in key]-?: o[requiredKey]
}

export type error<message extends string = string> = `!${message}`

export type stringKeyOf<t> = keyof t & string

export type numberKeyOf<t> = keyof t & number

export type RegexLiteral<expression extends string = string> = `/${expression}/`

export type autocomplete<suggestions extends string> =
    | suggestions
    | (string & {})

export type Dict = {
    readonly [k in string]: unknown
}

export type List = readonly unknown[]

export const listFrom = <t>(data: t) =>
    (Array.isArray(data) ? data : [data]) as t extends List ? t : [t]

export type CollapsibleList<t> = t | readonly t[]

export const collapseIfSingleton = <t extends List>(array: t): t | t[number] =>
    array.length === 1 ? array[0] : array
