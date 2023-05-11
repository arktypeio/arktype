import { domainOf, type inferDomain, type Primitive } from "./domains.js"
import type { List } from "./lists.js"
import type { BigintLiteral, NumberLiteral } from "./numericLiterals.js"
import {
    tryParseWellFormedBigint,
    tryParseWellFormedNumber
} from "./numericLiterals.js"
import type { Dict } from "./records.js"
import { isKeyOf } from "./records.js"

export type SerializationOptions = {
    onCycle?: (value: object) => string
    onSymbol?: (value: symbol) => string
    onFunction?: (value: Function) => string
    onUndefined?: string
}

export const snapshot = <t>(
    data: t,
    opts: SerializationOptions = { onUndefined: "(undefined)" }
) => serializeRecurse(data, opts, []) as snapshot<t>

export type snapshot<t, depth extends 1[] = []> = unknown extends t
    ? unknown
    : t extends Primitive
    ? snapshotPrimitive<t>
    : t extends Function
    ? `(function${string})`
    : t extends Date
    ? string
    : depth["length"] extends 10
    ? unknown
    : t extends List<infer item>
    ? List<snapshot<item, [...depth, 1]>>
    : {
          [k in keyof t]: snapshot<t[k], [...depth, 1]>
      }

type snapshotPrimitive<t> = t extends undefined
    ? "(undefined)"
    : t extends bigint
    ? `${t}n`
    : t extends symbol
    ? `(symbol${string})`
    : t

export const print = (data: unknown, indent?: number) =>
    console.log(stringify(data, indent))

export const stringify = (data: unknown, indent?: number) => {
    switch (domainOf(data)) {
        case "object":
            return JSON.stringify(
                serializeRecurse(data, stringifyOpts, []),
                null,
                indent
            )
        case "symbol":
            return stringifyOpts.onSymbol(data as symbol)
        default:
            return serializePrimitive(data as SerializablePrimitive)
    }
}

const stringifyOpts = {
    onCycle: () => "(cycle)",
    onSymbol: (v) => `(symbol${v.description && ` ${v.description}`})`,
    onFunction: (v) => `(function${v.name && ` ${v.name}`})`
} satisfies SerializationOptions

const serializeRecurse = (
    data: unknown,
    opts: SerializationOptions,
    seen: unknown[]
): unknown => {
    switch (domainOf(data)) {
        case "object":
            if (typeof data === "function") {
                return stringifyOpts.onFunction(data)
            }
            if (seen.includes(data)) {
                return "(cycle)"
            }
            const nextSeen = [...seen, data]
            if (Array.isArray(data)) {
                return data.map((item) =>
                    serializeRecurse(item, opts, nextSeen)
                )
            }
            if (data instanceof Date) {
                return data.toDateString()
            }
            const result: Record<string, unknown> = {}
            for (const k in data as Dict) {
                result[k] = serializeRecurse((data as any)[k], opts, nextSeen)
            }
            return result
        case "symbol":
            return stringifyOpts.onSymbol(data as symbol)
        case "bigint":
            return `${data}n`
        case "undefined":
            return opts.onUndefined ?? "undefined"
        default:
            return data
    }
}

type SerializedString<value extends string = string> = `"${value}"`

export type SerializedPrimitives = {
    string: SerializedString
    number: NumberLiteral
    bigint: BigintLiteral
    boolean: "true" | "false"
    null: "null"
    undefined: "undefined"
}

export type SerializedPrimitive =
    SerializedPrimitives[keyof SerializedPrimitives]

export type SerializablePrimitive = inferDomain<keyof SerializedPrimitives>

export const serializePrimitive = <value extends SerializablePrimitive>(
    value: value
) =>
    (typeof value === "string"
        ? JSON.stringify(value)
        : typeof value === "bigint"
        ? `${value}n`
        : `${value}`) as serializePrimitive<value>

export type serializePrimitive<value extends SerializablePrimitive> =
    value extends string
        ? `"${value}"`
        : value extends bigint
        ? `${value}n`
        : `${value}`

export const deserializePrimitive = <serialized extends SerializedPrimitive>(
    serialized: serialized
) =>
    (isKeyOf(serialized, serializedKeywords)
        ? serializedKeywords[serialized]
        : serialized[0] === `"`
        ? serialized.slice(1, -1)
        : tryParseWellFormedBigint(serialized) ??
          tryParseWellFormedNumber(
              serialized,
              true
          )) as deserializePrimitive<serialized>

export type deserializePrimitive<serialized extends SerializedPrimitive> =
    serialized extends keyof SerializedKeywords
        ? SerializedKeywords[serialized]
        : serialized extends SerializedString<infer value>
        ? value
        : serialized extends NumberLiteral<infer value>
        ? value
        : serialized extends BigintLiteral<infer value>
        ? value
        : never

const serializedKeywords = {
    true: true,
    false: false,
    undefined,
    null: null
} as const

type SerializedKeywords = typeof serializedKeywords
