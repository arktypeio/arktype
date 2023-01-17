import { hasDomain } from "./domains.ts"

export type downcast<t> = castWithExclusion<t, downcastRecurse<t>, []>

type downcastRecurse<t> = {
    [k in keyof t]: t[k] extends Downcastable | []
        ? t[k]
        : downcastRecurse<t[k]>
}

export type castWithExclusion<t, castTo, excluded> = t extends excluded
    ? t
    : castTo

export type Downcastable = string | boolean | number | bigint

/**
 * Note: Similarly to downcast, trying to evaluate 'unknown'
 * directly (i.e. not nested in an object) leads to the type '{}',
 * but I'm unsure how to fix this without breaking the types that rely on it.
 */
export type evaluate<t> = {
    [k in keyof t]: t[k]
} & unknown

/** Causes a type that would be eagerly calculated to be displayed as-is.
 *  WARNING: Makes t NonNullable as a side effect.
 */
export type defer<t> = t & {}

export type merge<base, merged> = evaluate<Omit<base, keyof merged> & merged>

/** Replace existing keys of o without altering readonly or optional modifiers  */
export type replaceProps<
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

export type extractKeysWithValue<o, filter> = {
    [k in keyof o]: isAny<o[k]> extends true
        ? never
        : o[k] extends never
        ? never
        : o[k] extends filter
        ? k
        : never
}[keyof o]

export type extractValues<o, filter> = o[extractKeysWithValue<o, filter>]

export type conform<t, base> = t extends base ? t : base

export const isKeyOf = <k extends string | number, obj extends object>(
    k: k,
    obj: obj
): k is Extract<keyof obj, k> => k in obj

export type constructor<instance = unknown> = new (...args: any[]) => instance

export type instanceOf<classType extends constructor<any>> =
    classType extends constructor<infer Instance> ? Instance : never

export type entryOf<o> = { [k in keyof o]-?: [k, o[k]] }[o extends List
    ? keyof o & number
    : keyof o]

export type entriesOf<o extends object> = entryOf<o>[]

export const entriesOf = <o extends object>(o: o) =>
    Object.entries(o) as entriesOf<o>

export type keyOf<o extends object> = o extends readonly unknown[]
    ? any[] extends o
        ? `${number}`
        : keyof o & `${number}`
    : keyof o extends number
    ? `${keyof o}`
    : Exclude<keyof o, symbol>

export const keysOf = <o extends object>(o: o) => Object.keys(o) as keyOf<o>[]

export type stringKeyOf<o> = keyof o & string

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

declare const id: unique symbol

export type nominal<t, id extends string> = t & {
    readonly [id]: id
}

export type assertEqual<t, u> = equals<t, u> extends true
    ? t
    : error<`types were not equivalent`>

export type identity<t> = (_: t) => t

export type extend<t, u extends t> = u

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type subsume<t extends u, u> = u

export type defined<t> = Exclude<t, undefined>

export type requireKeys<o, key extends keyof o> = o & {
    [requiredKey in key]-?: o[requiredKey]
}

export type optionalizeKeys<o, key extends keyof o> = Omit<o, key> & {
    [requiredKey in key]?: o[requiredKey]
}

export type requiredKeyOf<o> = {
    [k in keyof o]-?: o extends { [_ in k]-?: o[k] } ? k : never
}[keyof o]

export type optionalKeyOf<o> = Exclude<keyof o, requiredKeyOf<o>>

/** Type equivalent of ?? */
export type coalesce<t, fallback> = t extends {} ? t : fallback

export type error<message extends string = string> = nominal<
    `!${message}`,
    "error"
>

export type castOnError<t, to> = isTopType<t> extends true
    ? t
    : t extends never
    ? t
    : t extends error
    ? to
    : t

export type tryCatch<t, onValid> = isAny<t> extends true
    ? onValid
    : t extends never
    ? onValid
    : t extends error
    ? t
    : onValid

export type RegexLiteral<expression extends string = string> = `/${expression}/`

export type autocomplete<suggestions extends string> =
    | suggestions
    | (string & {})

export type tailOf<t extends List> = t extends readonly [unknown, ...infer tail]
    ? tail
    : []

export type headOf<t extends List> = t extends readonly [
    infer head,
    ...unknown[]
]
    ? head
    : never

export type tailOfString<S extends string> = S extends `${string}${infer Tail}`
    ? Tail
    : ""

export type headOfString<S extends string> = S extends `${infer Head}${string}`
    ? Head
    : ""

export type parametersOf<f> = f extends (...args: infer parameters) => unknown
    ? parameters
    : never

export type returnOf<f> = f extends (...args: never[]) => infer returns
    ? returns
    : never

export type Dict<k extends string = string, v = unknown> = {
    readonly [_ in k]: v
}

export type List<t = unknown> = readonly t[]

export type NonEmptyList<t = unknown> = readonly [t, ...t[]]

export const listFrom = <t>(data: t) =>
    (Array.isArray(data) ? data : [data]) as t extends List ? t : [t]

export type CollapsibleList<t> = t | readonly t[]

export const collapseIfSingleton = <t extends List>(array: t): t | t[number] =>
    array.length === 1 ? array[0] : array

/** Either:
 * A, with all properties of B as never
 * OR
 * B, with all properties of A as never
 **/
export type xor<a, b> =
    | evaluate<a & { [k in keyof b]?: never }>
    | evaluate<b & { [k in keyof a]?: never }>
