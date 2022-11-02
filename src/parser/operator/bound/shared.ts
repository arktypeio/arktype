import type { BoundData, BoundsData } from "../../../attributes/bounds.js"
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
    `Double-bound expressions must specify their bounds using < or <= (was ${comparator})`

export const buildInvalidDoubleMessage = <
    comparator extends Scanner.Comparator
>(
    comparator: comparator
): buildInvalidDoubleMessage<comparator> =>
    `Double-bound expressions must specify their bounds using < or <= (was ${comparator})`

export const toBoundsAttribute = (
    comparator: Scanner.Comparator,
    limit: number
): BoundsData => {
    const bound: BoundData = {
        limit,
        inclusive: comparator[1] === "="
    }
    if (comparator === "==") {
        return { min: bound, max: bound }
    } else if (comparator === ">" || comparator === ">=") {
        return {
            min: bound
        }
    } else {
        return {
            max: bound
        }
    }
}
