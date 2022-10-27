import type { Scanner } from "../parser/string/state/scanner.js"

export type BoundsAttribute = Readonly<{
    lower?: Bound
    upper?: Bound
}>

export type ReduceResult<T> = T | "never"

type Bound = Readonly<{
    limit: number
    inclusive: boolean
}>

export const reduceBounds = (
    base: BoundsAttribute,
    comparator: Scanner.Comparator,
    limit: number
): ReduceResult<BoundsAttribute> => {
    if (comparator === "==") {
        const equalityBound: Bound = { limit, inclusive: true }
        const lowerBoundResult = reduceLimit(base, "lower", equalityBound)
        if (lowerBoundResult === "never") {
            return "never"
        }
        return reduceLimit(lowerBoundResult, "upper", equalityBound)
    } else if (comparator === ">" || comparator === ">=") {
        return reduceLimit(base, "lower", {
            limit,
            inclusive: comparator === ">="
        })
    } else {
        return reduceLimit(base, "upper", {
            limit,
            inclusive: comparator === "<="
        })
    }
}

const invertedKinds = {
    lower: "upper",
    upper: "lower"
} as const

type BoundKind = keyof BoundsAttribute

const isStricter = (
    kind: BoundKind,
    candidateBound: Bound,
    baseBound: Bound
) => {
    if (
        candidateBound.limit === baseBound.limit &&
        candidateBound.inclusive === false &&
        baseBound.inclusive === true
    ) {
        return true
    } else if (kind === "lower") {
        return candidateBound.limit > baseBound.limit
    } else {
        return candidateBound.limit < baseBound.limit
    }
}

export const reduceLimit = (
    base: BoundsAttribute,
    kind: BoundKind,
    bound: Bound
): ReduceResult<BoundsAttribute> => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = base?.[kind]
    const baseOpposing = base?.[invertedKind]
    if (baseCompeting && !isStricter(kind, bound, baseCompeting)) {
        return base
    }
    if (baseOpposing && isStricter(invertedKind, bound, baseOpposing)) {
        return "never"
    }
    return {
        [kind]: bound,
        [invertedKind]: baseOpposing
    }
}
