export * from "../common.js"
import type { Comparator } from "../../parser/exports.js"
import { Parser } from "../common.js"
export { comparators } from "../../parser/exports.js"
export type { Comparator } from "../../parser/exports.js"

export const comparatorChars = Parser.tokenSet({
    "<": 1,
    ">": 1,
    "=": 1
})

export type ComparatorChar = keyof typeof comparatorChars

export const doubleBoundComparators = Parser.tokenSet({
    "<=": 1,
    "<": 1
})

export type DoubleBoundComparator = keyof typeof doubleBoundComparators

export type NormalizedLowerBoundComparator = ">=" | ">"

/** We have to invert the first comparator in an expression like
 * 5<=number<10
 * so that it can be split into two expressions like
 * number>=5
 * number<10
 */
export const invertedComparators = {
    "<": ">",
    ">": "<",
    "<=": ">=",
    ">=": "<=",
    "==": "=="
} as const

export type InvertedComparators = typeof invertedComparators

export const comparatorToString: Record<Comparator, string> = {
    "<": "less than",
    ">": "greater than",
    "<=": "less than or equal to",
    ">=": "greater than or equal to",
    "==": "exactly"
}

export const singleCharComparator = Parser.tokenSet({
    "<": 1,
    ">": 1
})

export type SingleCharComparator = keyof typeof singleCharComparator

export type InvalidDoubleBoundMessage<Token extends Comparator> =
    `Double-bound expressions must specify their bounds using < or <= (got ${Token}).`

export const invalidDoubleBoundMessage = <Token extends Comparator>(
    T: Token
): InvalidDoubleBoundMessage<Token> =>
    `Double-bound expressions must specify their bounds using < or <= (got ${T}).`
