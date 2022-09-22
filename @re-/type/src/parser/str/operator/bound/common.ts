import { keySet } from "@re-/tools"
import type { Scanner } from "../../state/scanner.js"
import { scanner } from "../../state/scanner.js"

export const comparatorChars = keySet({
    "<": 1,
    ">": 1,
    "=": 1
})

export type ComparatorChar = keyof typeof comparatorChars

export const doubleBoundComparators = keySet({
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

export const comparatorToString: Record<Scanner.Comparator, string> = {
    "<": "less than",
    ">": "greater than",
    "<=": "at most",
    ">=": "at least",
    "==": "exactly"
}

export const singleCharComparator = keySet({
    "<": 1,
    ">": 1
})

export type SingleCharComparator = keyof typeof singleCharComparator

export type InvalidDoubleBoundMessage<Token extends Scanner.Comparator> =
    `Double-bound expressions must specify their bounds using < or <= (was ${Token}).`

export const invalidDoubleBoundMessage = <Token extends Scanner.Comparator>(
    T: Token
): InvalidDoubleBoundMessage<Token> =>
    `Double-bound expressions must specify their bounds using < or <= (was ${T}).`
