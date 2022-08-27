export * from "../common.js"
import { Parser } from "../common.js"

export const comparators = Parser.tokenSet({
    "<": 1,
    ">": 1,
    ">=": 1,
    "<=": 1,
    "==": 1
})

export type Comparator = keyof typeof comparators

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
export const normalizeLowerBoundComparator = (token: DoubleBoundComparator) =>
    token === "<" ? ">" : ">="

export type NormalizeLowerBoundComparator<Token extends DoubleBoundComparator> =
    Token extends "<" ? ">" : ">="
