import { keySet } from "@re-/tools"

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

export const singleCharComparator = keySet({
    "<": 1,
    ">": 1
})

export type SingleCharComparator = keyof typeof singleCharComparator

export type InvalidDoubleBoundMessage<Token extends Comparator> =
    `Double-bound expressions must specify their bounds using < or <= (was ${Token}).`

export const invalidDoubleBoundMessage = <Token extends Comparator>(
    token: Token
): InvalidDoubleBoundMessage<Token> =>
    `Double-bound expressions must specify their bounds using < or <= (was ${token}).`
