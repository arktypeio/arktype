import type { inferDomain, Primitive } from "./domains.ts"
import { domainOf } from "./domains.ts"
import type { Dict, isTopType } from "./generics.js"
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

type SerializationContext = SerializationOptions & { seen: unknown[] }

export const snapshot = <t>(data: t, opts: SerializationOptions = {}) => {
    ;(opts as SerializationContext).seen = []
    return snapshotRecurse(data, opts as SerializationContext) as snapshot<t>
}

export type snapshot<t> = isTopType<t> extends true
    ? unknown
    : t extends Primitive
    ? snapshotPrimitive<t>
    : t extends Function
    ? `(function${string})`
    : {
          [k in keyof t]: snapshot<t[k]>
      }

type snapshotPrimitive<t> = t extends undefined
    ? "undefined"
    : t extends bigint
    ? `${t}n`
    : t extends symbol
    ? `(symbol${string})`
    : t

const snapshotRecurse = (
    v: unknown,
    context: SerializationContext
): unknown => {
    switch (domainOf(v)) {
        case "object":
            if (context.seen.includes(v)) {
                return "(cycle)"
            }
            if (typeof v === "function") {
                return alwaysIncludeOptions.onFunction(v)
            }
            context.seen = [...context.seen, v]
            if (Array.isArray(v)) {
                return v.map((item) => snapshotRecurse(item, context))
            }
            const result: Record<string, unknown> = {}
            for (const k in v as Dict) {
                result[k] = snapshotRecurse((v as any)[k], context)
            }
            return result
        case "symbol":
            return alwaysIncludeOptions.onSymbol(v as symbol)
        case "bigint":
            return `${v}n`
        default:
            return `${v}`
    }
}

// TODO: compare perf
export const serialize = (data: unknown, opts: SerializationOptions = {}) => {
    const seen: unknown[] = []
    return JSON.stringify(data, (k, v) => {
        const domain = domainOf(v)
        if (domain === "object") {
            if (seen.includes(v)) {
                return opts.onCycle?.(v)
            }
            if (typeof v === "function") {
                return opts.onFunction?.(v)
            }
            return v
        }
        if (domain === "symbol") {
            return opts.onSymbol?.(v)
        }
        return serializePrimitive(v)
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
