import { getRegex } from "../utils/regexCache.js"
import type { Bounds } from "./bounds.js"
import type { IntersectionReducer } from "./intersection.js"

export type PrimitiveAttributes = {
    readonly divisor?: number
    readonly regex?: RegexAttribute
    readonly bounds?: Bounds
}

export type StringAttributes = Pick<PrimitiveAttributes, "regex" | "bounds">

export type NumberAttributes = Pick<PrimitiveAttributes, "divisor" | "bounds">

type LiteralValue = string | number | boolean

export type PrimitiveLiteral<t extends LiteralValue> = { readonly value: t }

export type RegexAttribute = string | readonly string[]

export const checkRegex = (data: string, regex: RegexAttribute) =>
    typeof regex === "string"
        ? checkRegexExpression(data, regex)
        : regex.every((regexSource) => checkRegexExpression(data, regexSource))

const checkRegexExpression = (data: string, regexSource: string) =>
    getRegex(regexSource).test(data)

export const regexIntersection: IntersectionReducer<RegexAttribute> = (
    l,
    r
) => {
    if (typeof l === "string") {
        if (typeof r === "string") {
            return l === r ? true : [l, r]
        }
        return r.includes(l) ? r : [...r, l]
    }
    if (typeof r === "string") {
        return l.includes(r) ? l : [...l, r]
    }
    const result = [...l]
    for (const expression of r) {
        if (!l.includes(expression)) {
            result.push(expression)
        }
    }
    return result.length === l.length
        ? result.length === r.length
            ? true
            : l
        : result.length === r.length
        ? r
        : result
}

export const checkDivisor = (data: number, divisor: number) =>
    data % divisor === 0

export const divisorIntersection: IntersectionReducer<number> = (
    l: number,
    r: number
) => (l === r ? true : Math.abs((l * r) / greatestCommonDivisor(l, r)))

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
