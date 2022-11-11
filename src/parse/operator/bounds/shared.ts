import type { Scanner } from "../../state/scanner.js"

export const comparatorDescriptions = {
    "<": "less than",
    ">": "greater than",
    "<=": "at most",
    ">=": "at least",
    "==": "exactly"
} as const

export const invertedComparators = {
    "<": ">",
    ">": "<",
    "<=": ">=",
    ">=": "<=",
    "==": "=="
} as const

export type InvertedComparators = typeof invertedComparators

export type buildInvalidDoubleBoundMessage<
    comparator extends Scanner.Comparator
> = `Double-bound expressions must specify their bounds using < or <= (was ${comparator})`

export const buildInvalidDoubleBoundMessage = <
    comparator extends Scanner.Comparator
>(
    comparator: comparator
): buildInvalidDoubleBoundMessage<comparator> =>
    `Double-bound expressions must specify their bounds using < or <= (was ${comparator})`
