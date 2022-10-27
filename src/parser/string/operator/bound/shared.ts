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

// if (comparator === "==") {
//     const equalityBound: Bound = { limit, inclusive: true }
//     const lowerBoundResult = reduceLimit(base, "lower", equalityBound)
//     if (lowerBoundResult === "never") {
//         return "never"
//     }
//     return reduceLimit(lowerBoundResult, "upper", equalityBound)
// } else if (comparator === ">" || comparator === ">=") {
//     return reduceLimit(base, "lower", {
//         limit,
//         inclusive: comparator === ">="
//     })
// } else {
//     return reduceLimit(base, "upper", {
//         limit,
//         inclusive: comparator === "<="
//     })
// }
