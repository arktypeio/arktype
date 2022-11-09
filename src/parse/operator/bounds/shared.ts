import { throwInternalError } from "../../../utils/internalArktypeError.js"
import { parseWellFormedNumber } from "../../../utils/numericLiterals.js"
import type { Scanner } from "../../state/scanner.js"
import type { Intersector } from "../intersection/compile.js"

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

export type SerializedBounds = SerializedBound | SerializedRange

export type SerializedBound = `${Scanner.Comparator}${number}`

export type SerializedRange = `${SerializedMin}${SerializedMax}`

export type SerializedMin = `${">" | ">="}${number}`

export type SerializedMax = `${"<" | "<="}${number}`

const boundStringRegex = /^([<>=]=?)([^<>=]+)$|^(>=?)([^<>=]+)(<=?)([^<>=]+)$/

type DeserializedBounds = {
    min?: DeserializedBound
    max?: DeserializedBound
}

type DeserializedBound = {
    limit: number
    inclusive: boolean
}

const deserializeBounds = (
    boundsString: SerializedBounds
): DeserializedBounds => {
    const matches = boundStringRegex.exec(boundsString)
    if (!matches) {
        return throwInternalError(
            `Unexpectedly failed to parse bounds from '${boundsString}'`
        )
    }
    if (matches[1]) {
        return deserializeBound(
            matches[1],
            parseWellFormedNumber(matches[2], true)
        )
    }
    return deserializeRange(
        matches[3],
        parseWellFormedNumber(matches[4], true),
        matches[5],
        parseWellFormedNumber(matches[6], true)
    )
}

const serializeBounds = (bounds: DeserializedBounds): SerializedBounds => {
    if (bounds.min?.limit === bounds.max?.limit) {
        return `==${bounds.min!.limit}`
    }
    let result = ""
    if (bounds.min) {
        result += bounds.min.inclusive ? ">=" : ">"
        result += bounds.min.limit
    }
    if (bounds.max) {
        result += bounds.max.inclusive ? "<=" : "<"
        result += bounds.max.limit
    }
    return result as SerializedBounds
}

const deserializeBound = (
    comparator: string,
    limit: number
): DeserializedBounds => {
    const bound: DeserializedBound = {
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

const deserializeRange = (
    minComparator: string,
    minLimit: number,
    maxComparator: string,
    maxLimit: number
): DeserializedBounds => ({
    min: {
        limit: minLimit,
        inclusive: minComparator[1] === "="
    },
    max: {
        limit: maxLimit,
        inclusive: maxComparator[1] === "="
    }
})

export const intersectBounds: Intersector<"bounds"> = (
    stringifiedA,
    stringifiedB
) => {
    const a = deserializeBounds(stringifiedA)
    const b = deserializeBounds(stringifiedB)
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
