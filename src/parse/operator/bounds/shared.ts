import type { OperateAttribute } from "../../state/attributes/operations.js"
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

// TODO: Add diff
export const operateBounds: OperateAttribute<SerializedBounds> = (
    serializedA,
    serializedB,
    operator
) => {
    const a = deserializeBounds(serializedA)
    const b = deserializeBounds(serializedB)
    if (b.min) {
        const result = intersectBound("min", a, b.min)
        if (result === null) {
            return result
        }
        a.min = result
    }
    if (b.max) {
        const result = intersectBound("max", a, b.max)
        if (result === null) {
            return result
        }
        a.max = result
    }
    return serializeBounds(a)
}

const intersectBound = (
    kind: BoundKind,
    a: DeserializedBounds,
    boundOfB: DeserializedBound
): DeserializedBound | null => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = a[kind]
    const baseOpposing = a[invertedKind]
    if (baseOpposing && isStricter(kind, boundOfB, baseOpposing)) {
        return null
    }
    if (!baseCompeting || isStricter(kind, boundOfB, baseCompeting)) {
        return boundOfB
    }
    return baseCompeting
}

const invertedKinds = {
    min: "max",
    max: "min"
} as const

type BoundKind = keyof typeof invertedKinds

const isStricter = (
    kind: BoundKind,
    candidate: DeserializedBound,
    base: DeserializedBound
) => {
    if (
        candidate.limit === base.limit &&
        candidate.inclusive === false &&
        base.inclusive === true
    ) {
        return true
    } else if (kind === "min") {
        return candidate.limit > base.limit
    } else {
        return candidate.limit < base.limit
    }
}
