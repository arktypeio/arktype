import { hasDomain } from "./domains.js"
import type { asConst, defined, evaluate } from "./generics.js"
import type { List } from "./lists.js"

export type Dict<k extends string = string, v = unknown> = {
    readonly [_ in k]: v
}

/** Either:
 * A, with all properties of B undefined
 * OR
 * B, with all properties of A undefined
 **/
export type xor<a, b> =
    | evaluate<a & { [k in keyof b]?: undefined }>
    | evaluate<b & { [k in keyof a]?: undefined }>

export type requireKeys<o, key extends keyof o> = o & {
    [requiredKey in key]-?: defined<o[requiredKey]>
}

export const hasKey = <o extends object, k extends keyof o>(
    o: o,
    k: k
): o is requireKeys<o, k> => k in o

export type keySet<key extends string = string> = { readonly [_ in key]?: true }

export const hasKeys = (value: unknown) =>
    hasDomain(value, "object") ? Object.keys(value).length !== 0 : false

export type mutable<o> = {
    -readonly [k in keyof o]: o[k]
}

export type entryOf<o> = evaluate<
    { [k in keyof o]-?: [k, defined<o[k]>] }[o extends List
        ? keyof o & number
        : keyof o]
>

export type entriesOf<o extends object> = evaluate<entryOf<o>[]>

export const entriesOf = <o extends object>(o: o) =>
    Object.entries(o) as entriesOf<o>

export type Key = string | number | symbol

type Entry<key extends Key = Key, value = unknown> = readonly [
    key: key,
    value: value
]

export type fromEntries<entries, result = {}> = entries extends readonly [
    Entry<infer k, infer v>,
    ...infer tail
]
    ? fromEntries<tail, { [_ in k]: v } & result>
    : evaluate<result>

export const fromEntries = <entries>(entries: asConst<entries>) =>
    Object.fromEntries(entries as Entry[]) as fromEntries<entries>

/** Mimics the result of Object.keys(...) */
export type keysOf<o> = [o] extends [object]
    ? o extends readonly unknown[]
        ? any[] extends o
            ? `${number}`
            : keyof o & `${number}`
        : keyof o extends number
        ? `${keyof o}`
        : Exclude<keyof o, symbol>
    : never

export const keysOf = <o extends object>(o: o) => Object.keys(o) as keysOf<o>[]

export const isKeyOf = <k extends string | number, obj extends object>(
    k: k,
    obj: obj
): k is Extract<keyof obj, k> => k in obj
