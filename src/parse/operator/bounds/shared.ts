import type { AttributeIntersection } from "../../state/attributes/keySets.js"
import type { Scanner } from "../../state/scanner.js"
import type {
    DeserializedBound,
    DeserializedBounds,
    SerializedBounds
} from "./serialization.js"
import { deserializeBounds, serializeBounds } from "./serialization.js"

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
