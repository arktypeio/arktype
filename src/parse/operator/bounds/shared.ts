import { throwInternalError } from "../../../utils/internalArktypeError.js"
import { UnenclosedNumber } from "../../operand/numeric.js"
import type {
    EmptyIntersectionResult,
    Intersector
} from "../../state/intersection.js"
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

export type BoundsString = SingleBoundString | DoubleBoundString

type SingleBoundString = `${Scanner.Comparator}${number}`

type DoubleBoundString = `${">" | ">="}${number}${"<" | "<="}${number}`

const boundStringRegex = /^([<>=]=?)([^<>=]+)$|^(>=?)([^<>=]+)(<=?)([^<>=]+)$/

type ParsedBounds = {
    min?: ParsedBound
    max?: ParsedBound
}

type ParsedBound = {
    limit: number
    inclusive: boolean
}

const parseLimit = (limitString: string) =>
    UnenclosedNumber.parseWellFormed(limitString, "number", true)

const parseBounds = (boundsString: BoundsString): ParsedBounds => {
    const matches = boundStringRegex.exec(boundsString)
    if (!matches) {
        return throwInternalError(
            `Unexpectedly failed to parse bounds from '${boundsString}'`
        )
    }
    if (matches[1]) {
        return parseSingleBound(matches[1], parseLimit(matches[2]))
    }
    return parseDoubleBound(
        matches[3],
        parseLimit(matches[4]),
        matches[5],
        parseLimit(matches[6])
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

const parseSingleBound = (comparator: string, limit: number): ParsedBounds => {
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

const parseDoubleBound = (
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

export const intersectBounds: Intersector<"bounds"> = (stringA, stringB) => {
    const a = parseBounds(stringA)
    const { min, max } = parseBounds(stringB)
    if (min) {
        const maybeContradiction = intersectBound("min", a, min)
        if (maybeContradiction) {
            return maybeContradiction
        }
    }
    if (max) {
        const maybeContradiction = intersectBound("max", a, max)
        if (maybeContradiction) {
            return maybeContradiction
        }
    }
    return stringifyBounds(a)
}

const intersectBound = (
    kind: BoundKind,
    a: ParsedBounds,
    boundOfB: ParsedBound
): EmptyIntersectionResult<BoundsString> | undefined => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = a[kind]
    const baseOpposing = a[invertedKind]
    if (baseOpposing && isStricter(kind, boundOfB, baseOpposing)) {
        return createBoundsContradiction(kind, baseOpposing, boundOfB)
    }
    if (!baseCompeting || isStricter(kind, boundOfB, baseCompeting)) {
        a[kind] = boundOfB
    }
}

const createBoundsContradiction = (
    kind: BoundKind,
    baseOpposing: ParsedBound,
    bound: ParsedBound
): EmptyIntersectionResult<BoundsString> => [
    stringifyBounds({ [invertedKinds[kind]]: baseOpposing }),
    stringifyBounds({
        [kind]: bound
    })
]

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
