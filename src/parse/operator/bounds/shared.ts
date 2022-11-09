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

export type buildInvalidDoubleMessage<comparator extends Scanner.Comparator> =
    `Double-bound expressions must specify their bounds using < or <= (was ${comparator})`

export const buildInvalidDoubleMessage = <
    comparator extends Scanner.Comparator
>(
    comparator: comparator
): buildInvalidDoubleMessage<comparator> =>
    `Double-bound expressions must specify their bounds using < or <= (was ${comparator})`

export type BoundsString = BoundString | RangeString

export type BoundString = `${Scanner.Comparator}${number}`

export type RangeString = `${MinString}${MaxString}`

export type MinString = `${">" | ">="}${number}`

export type MaxString = `${"<" | "<="}${number}`

const boundStringRegex = /^([<>=]=?)([^<>=]+)$|^(>=?)([^<>=]+)(<=?)([^<>=]+)$/

type ParsedBounds = {
    min?: ParsedBound
    max?: ParsedBound
}

type ParsedBound = {
    limit: number
    inclusive: boolean
}

const parseBounds = (boundsString: BoundsString): ParsedBounds => {
    const matches = boundStringRegex.exec(boundsString)
    if (!matches) {
        return throwInternalError(
            `Unexpectedly failed to parse bounds from '${boundsString}'`
        )
    }
    if (matches[1]) {
        return parseBound(matches[1], parseWellFormedNumber(matches[2], true))
    }
    return parseRange(
        matches[3],
        parseWellFormedNumber(matches[4], true),
        matches[5],
        parseWellFormedNumber(matches[6], true)
    )
}

const stringifyBounds = (bounds: ParsedBounds): BoundsString => {
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
    return result as BoundsString
}

const parseBound = (comparator: string, limit: number): ParsedBounds => {
    const bound: ParsedBound = {
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

const parseRange = (
    minComparator: string,
    minLimit: number,
    maxComparator: string,
    maxLimit: number
): ParsedBounds => ({
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
    const a = parseBounds(stringifiedA)
    const b = parseBounds(stringifiedB)
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
    return stringifyBounds(a)
}

const intersectBound = (
    kind: BoundKind,
    a: ParsedBounds,
    boundOfB: ParsedBound
): ParsedBound | null => {
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
    candidate: ParsedBound,
    base: ParsedBound
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
