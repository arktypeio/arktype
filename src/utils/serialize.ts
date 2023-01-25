import type { inferDomain, Primitive } from "./domains.ts"
import { domainOf } from "./domains.ts"
import type { Dict, isTopType, List } from "./generics.js"
import { isKeyOf } from "./generics.js"
import type { BigintLiteral, NumberLiteral } from "./numericLiterals.js"
import {
    tryParseWellFormedBigint,
    tryParseWellFormedNumber
} from "./numericLiterals.js"

export type SerializationOptions = {
    onCycle?: (value: object) => string
    onSymbol?: (value: symbol) => string
    onFunction?: (value: Function) => string
}

export const snapshot = <t>(data: t, opts: SerializationOptions = {}) =>
    snapshotRecurse(data, opts, []) as snapshot<t>

export type snapshot<t, depth extends 1[] = []> = isTopType<t> extends true
    ? unknown
    : t extends Primitive
    ? snapshotPrimitive<t>
    : t extends Function
    ? `(function${string})`
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

const snapshotRecurse = (
    v: unknown,
    context: SerializationOptions,
    seen: unknown[]
): unknown => {
    switch (domainOf(v)) {
        case "object":
            if (typeof v === "function") {
                return alwaysIncludeOptions.onFunction(v)
            }
            if (seen.includes(v)) {
                return "(cycle)"
            }
            const nextSeen = [...seen, v]
            if (Array.isArray(v)) {
                return v.map((item) => snapshotRecurse(item, context, nextSeen))
            }
            const result: Record<string, unknown> = {}
            for (const k in v as Dict) {
                result[k] = snapshotRecurse((v as any)[k], context, nextSeen)
            }
            return result
        case "symbol":
            return alwaysIncludeOptions.onSymbol(v as symbol)
        case "bigint":
            return `${v}n`
        case "undefined":
            return "(undefined)"
        default:
            return v
    }
}

export const serialize = (data: unknown, opts: SerializationOptions = {}) => {
    const seen: unknown[] = []
    return JSON.stringify(data, (k, v) => {
        switch (domainOf(v)) {
            case "object":
                if (seen.includes(v)) {
                    return opts.onCycle?.(v)
                }
                if (typeof v === "function") {
                    return opts.onFunction?.(v)
                }
                return v
            case "undefined":
                return "(undefined)"
            case "symbol":
                return opts.onSymbol?.(v)
            case "bigint":
                return `${v}n`
            default:
                return v
        }
    })
}

const alwaysIncludeOptions = {
    onCycle: () => "(cycle)",
    onSymbol: (v) => `(symbol${v.description && ` ${v.description}`})`,
    onFunction: (v) => `(function${v.name && ` ${v.name}`})`
} satisfies SerializationOptions

export const stringify = (data: unknown) =>
    serialize(data, alwaysIncludeOptions)

type SerializedString = `'${string}'`

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
        ? `'${value}'`
        : typeof value === "bigint"
        ? `${value}n`
        : `${value}`) as serializePrimitive<value>

export type serializePrimitive<value extends SerializablePrimitive> =
    value extends string
        ? `'${value}'`
        : value extends bigint
        ? `${value}n`
        : `${value}`

export const deserializePrimitive = <serialized extends SerializedPrimitive>(
    serialized: serialized
) =>
    (isKeyOf(serialized, serializedKeywords)
        ? serializedKeywords[serialized]
        : serialized[0] === "'"
        ? serialized.slice(1, -1)
        : tryParseWellFormedBigint(serialized) ??
          tryParseWellFormedNumber(
              serialized,
              true
          )) as deserializePrimitive<serialized>

export type deserializePrimitive<serialized extends SerializedPrimitive> =
    serialized extends keyof SerializedKeywords
        ? SerializedKeywords[serialized]
        : serialized extends SerializedString
        ? string
        : serialized extends BigintLiteral
        ? bigint
        : number

const serializedKeywords = {
    true: true,
    false: false,
    undefined,
    null: null
} as const

type SerializedKeywords = typeof serializedKeywords
