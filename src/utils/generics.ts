import { hasDomain } from "./domains.js"

export const asConst = <t>(t: asConstRecurse<t>) => t

export type asConst<t> = castWithExclusion<t, asConstRecurse<t>, []>

type asConstRecurse<t> = {
    [k in keyof t]: t[k] extends Literalable | [] ? t[k] : asConstRecurse<t[k]>
} & unknown

export type castWithExclusion<t, castTo, excluded> = t extends excluded
    ? t
    : castTo

export type Literalable = string | boolean | number | bigint

export type evaluateObjectOrFunction<t> = isTopType<t> extends true
    ? t
    : t extends (...args: infer args) => infer ret
    ? (...args: args) => ret
    : evaluate<t>

export type evaluate<t> = { [k in keyof t]: t[k] } & unknown

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

export type entryOf<o> = evaluate<
    { [k in keyof o]-?: [k, defined<o[k]>] }[o extends List
        ? keyof o & number
        : keyof o]
>

export type entriesOf<o extends object> = evaluate<entryOf<o>[]>

export const entriesOf = <o extends object>(o: o) =>
    Object.entries(o) as entriesOf<o>

/** Mimics the result of Object.keys(...) */
export type objectKeysOf<o> = [o] extends [object]
    ? o extends readonly unknown[]
        ? any[] extends o
            ? `${number}`
            : keyof o & `${number}`
        : keyof o extends number
        ? `${keyof o}`
        : Exclude<keyof o, symbol>
    : never

export const objectKeysOf = <o extends object>(o: o) =>
    Object.keys(o) as objectKeysOf<o>[]

export type stringKeyOf<o> = keyof o & string

/** Mimics output of TS's keyof operator at runtime */
export const prototypeKeysOf = <t>(value: t): evaluate<keyof t>[] => {
    const result: (string | number | symbol)[] = []
    while (
        value !== Object.prototype &&
        value !== null &&
        value !== undefined
    ) {
        for (const k of Object.getOwnPropertyNames(value)) {
            if (!result.includes(k)) {
                result.push(k)
            }
        }
        for (const symbol of Object.getOwnPropertySymbols(value)) {
            if (!result.includes(symbol)) {
                result.push(symbol)
            }
        }
        value = Object.getPrototypeOf(value)
    }
    return result as evaluate<keyof t>[]
}

export const hasKey = <o, k extends string>(
    o: o,
    k: k
): o is Extract<o, { [_ in k]: {} }> => {
    const valueAtKey = (o as any)?.[k]
    return valueAtKey !== undefined && valueAtKey !== null
}

export const hasSingleKey = <o extends object, k extends string>(
    o: o,
    k: k
): o is o & { [_ in k]: {} } => k in o && Object.keys(o).length === 1

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

/** Check for type equality without breaking TS for this repo. Fails on some types like Dict/{} */
export type equals<t, u> = identity<t> extends identity<u> ? true : false

const id = Symbol("id")

export const nominal = <o extends object, name extends string>(
    o: o,
    name: name
): nominal<o, name> => Object.assign(o, { [id]: name })

export type nominal<t, id extends string> = t & {
    readonly [id]: id
}

export const getNominalId = <data>(data: data) =>
    hasDomain(data, "object") && id in data ? data[id] : undefined

export const hasNominalId = <data, name extends string>(
    data: data,
    name: name
): data is nominal<data, name> => getNominalId(data) === name

export type assertEqual<t, u> = equals<t, u> extends true
    ? t
    : error<`types were not equivalent`>

export type identity<in out t> = (_: t) => t

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

export type arraySubclassToReadonly<t extends unknown[]> =
    readonly t[number][] & {
        [k in Exclude<keyof t, keyof unknown[]>]: t[k]
    }

export type HomogenousTuple<
    item,
    length extends number,
    result extends item[] = []
> = result["length"] extends length
    ? result
    : HomogenousTuple<item, length, [...result, item]>

export const listFrom = <t>(data: t) =>
    (Array.isArray(data) ? data : [data]) as t extends List ? t : readonly t[]

export type CollapsibleList<t> = t | readonly t[]

/** Either:
 * A, with all properties of B undefined
 * OR
 * B, with all properties of A undefined
 **/
export type xor<a, b> =
    | evaluate<a & { [k in keyof b]?: undefined }>
    | evaluate<b & { [k in keyof a]?: undefined }>
