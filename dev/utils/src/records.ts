import { hasDomain } from "./domains.js"
import type { defined, evaluate } from "./generics.js"
import { isArray } from "./objectKinds.js"
import type { intersectUnion } from "./unionToTuple.js"

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

export const hasKey = <o extends object, k extends PropertyKey>(
    o: o,
    k: k
): o is Extract<o, { [_ in k]: {} | null }> => k in o

export type keySet<key extends string = string> = { readonly [_ in key]?: true }

export const hasKeys = (value: unknown) =>
    hasDomain(value, "object") ? Object.keys(value).length !== 0 : false

export type mutable<o> = {
    -readonly [k in keyof o]: o[k]
}

export type entryOf<o> = {
    [k in keyof o]-?: [k, o[k] & ({} | null)]
}[o extends readonly unknown[] ? keyof o & number : keyof o] &
    unknown

export type entriesOf<o extends object> = evaluate<entryOf<o>[]>

export const entriesOf = <o extends object>(o: o) =>
    Object.entries(o) as entriesOf<o>

type Entry<key extends PropertyKey = PropertyKey, value = unknown> = readonly [
    key: key,
    value: value
]

export type fromEntries<entries, result = {}> = entries extends readonly [
    Entry<infer k, infer v>,
    ...infer tail
]
    ? fromEntries<tail, result & { [_ in k]: v }>
    : evaluate<result>

export const fromEntries = <const entries extends readonly Entry[]>(
    entries: entries
) => Object.fromEntries(entries) as fromEntries<entries>

export const transform = <
    const o extends object,
    transformed extends Entry | readonly Entry[]
>(
    o: o,
    flatMapEntry: (entry: entryOf<o>) => transformed
) =>
    Object.fromEntries(
        entriesOf(o).flatMap((entry) => {
            const result = flatMapEntry(entry)
            return isArray(result[0]) ? result : [result]
        })
    ) as evaluate<
        intersectUnion<
            fromEntries<
                transformed extends readonly Entry[]
                    ? transformed
                    : [transformed]
            >
        >
    >

/** Mimics the result of Object.keys(...) */
export type keysOf<o> = o extends readonly unknown[]
    ? number extends o["length"]
        ? `${number}`
        : keyof o & `${number}`
    : {
          [K in keyof o]: K extends string
              ? K
              : K extends number
              ? `${K}`
              : never
      }[keyof o]

export const keysOf = <o extends object>(o: o) => Object.keys(o) as keysOf<o>[]

export const isKeyOf = <k extends string | number | symbol, obj extends object>(
    k: k,
    obj: obj
): k is Extract<keyof obj, k> => k in obj

export type requiredKeyOf<o> = {
    [k in keyof o]-?: o extends { [_ in k]-?: o[k] } ? k : never
}[keyof o]

export type optionalKeyOf<o> = Exclude<keyof o, requiredKeyOf<o>>
