import type { defined, mutable, subtype, xor } from "../../utils/generics.js"
import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import { getRegex } from "../../utils/regexCache.js"
import type { TypeName } from "../../utils/typeOf.js"
import { hasType } from "../../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection } from "./bounds.js"

export type BasePrimitiveAttributes = {
    readonly type: Exclude<TypeName, "object">
    readonly literal?: LiteralValue
    readonly bounds?: Bounds
    readonly divisor?: number
    readonly regex?: RegexAttribute
}

export type PrimitiveAttributes = subtype<
    BasePrimitiveAttributes,
    | BigintAttributes
    | BooleanAttributes
    | NullAttributes
    | NumberAttributes
    | StringAttributes
    | SymbolAttributes
    | UndefinedAttributes
>

export type PrimitiveAttributeName = keyof BasePrimitiveAttributes

export type PrimitiveAttributeType<k extends PrimitiveAttributeName> = defined<
    BasePrimitiveAttributes[k]
>

export type BigintAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "bigint"
        readonly literal?: IntegerLiteral
    }
>

export type BooleanAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "boolean"
        readonly literal?: boolean
    }
>

export type NullAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "null"
    }
>

export type NumberAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "number"
    } & xor<
        { readonly literal?: number },
        {
            readonly bounds?: Bounds
            readonly divisor?: number
        }
    >
>

export type StringAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "string"
    } & xor<
        { readonly literal?: string },
        {
            readonly bounds?: Bounds
            readonly regex?: RegexAttribute
        }
    >
>

export type SymbolAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "symbol"
    }
>

export type UndefinedAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "undefined"
    }
>

export type LiteralValue = string | number | boolean

export type RegexAttribute = string | readonly string[]

export const checkRegex = (data: string, regex: RegexAttribute) =>
    typeof regex === "string"
        ? checkRegexExpression(data, regex)
        : regex.every((regexSource) => checkRegexExpression(data, regexSource))

const checkRegexExpression = (data: string, regexSource: string) =>
    getRegex(regexSource).test(data)

export const regexIntersection: PrimitiveKeyIntersection<RegexAttribute> = (
    l,
    r
) => {
    if (hasType(l, "string")) {
        if (hasType(r, "string")) {
            return l === r ? l : [l, r]
        }
        return r.includes(l) ? r : [...r, l]
    }
    if (hasType(r, "string")) {
        return l.includes(r) ? l : [...l, r]
    }
    const result = [...l]
    for (const expression of r) {
        if (!l.includes(expression)) {
            result.push(expression)
        }
    }
    return result
}

export const divisorIntersection = (l: number, r: number) =>
    Math.abs((l * r) / greatestCommonDivisor(l, r))

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (l: number, r: number) => {
    let previous
    let greatestCommonDivisor = l
    let current = r
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return greatestCommonDivisor
}

export type PrimitiveKeyIntersection<t> = (l: t, r: t) => t | null

type IntersectedPrimitiveKey = Exclude<
    keyof BasePrimitiveAttributes,
    "type" | "literal"
>

const primitiveIntersections: {
    [k in IntersectedPrimitiveKey]: PrimitiveKeyIntersection<
        PrimitiveAttributeType<k>
    >
} = {
    bounds: boundsIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection
}

// Fix bigint to check right value
export const checkPrimitive = (
    data: unknown,
    attributes: BasePrimitiveAttributes
) => true

export const primitiveIntersection = (
    l: BasePrimitiveAttributes,
    r: BasePrimitiveAttributes
): PrimitiveAttributes | "never" => {
    if (l.literal !== undefined) {
        if (r.literal !== undefined) {
            return l.literal === r.literal
                ? (l as PrimitiveAttributes)
                : "never"
        }
        return checkPrimitive(l.literal, r)
            ? (l as PrimitiveAttributes)
            : "never"
    }
    if (r.literal !== undefined) {
        return checkPrimitive(r.literal, l)
            ? (r as PrimitiveAttributes)
            : "never"
    }
    const { type, literal, ...attributes } = { ...l, ...r }
    const result: mutable<BasePrimitiveAttributes> = { type }
    let k: IntersectedPrimitiveKey
    for (k in attributes) {
        if (l[k] && r[k]) {
            const keyResult = (
                primitiveIntersections[k] as PrimitiveKeyIntersection<any>
            )(l[k], r[k])
            if (keyResult === null) {
                return "never"
            }
            result[k] = keyResult
        }
    }
    return result as PrimitiveAttributes
}
