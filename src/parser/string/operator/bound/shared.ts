import type { BoundData } from "../../../../attributes/bounds.js"
import { stringifyBounds } from "../../../../attributes/bounds.js"
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

export type buildInvalidDoubleMessage<comparator extends Scanner.Comparator> =
    `Double-bound expressions must specify their bounds using < or <= (was ${comparator}).`

export const buildInvalidDoubleMessage = <
    comparator extends Scanner.Comparator
>(
    comparator: comparator
): buildInvalidDoubleMessage<comparator> =>
    `Double-bound expressions must specify their bounds using < or <= (was ${comparator}).`

export const toBoundString = (
    comparator: Scanner.Comparator,
    limit: number
) => {
    const bound: BoundData = {
        limit,
        inclusive: comparator[1] === "="
    }
    if (comparator === "==") {
        return stringifyBounds({ min: bound, max: bound })
    } else if (comparator === ">" || comparator === ">=") {
        return stringifyBounds({
            min: bound
        })
    } else {
        return stringifyBounds({
            max: bound
        })
    }
}
