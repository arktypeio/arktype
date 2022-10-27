import type { Scanner } from "../parser/string/state/scanner.js"
import type { Attributes } from "./attributes.js"
import { reduceType } from "./type.js"

export type BoundsAttribute = Readonly<{
    lower?: Bound
    upper?: Bound
}>

type Bound = Readonly<{
    limit: number
    inclusive: boolean
}>

export const reduceBound: Attributes.Reducer<
    [comparator: Scanner.Comparator, limit: number]
> = (base, comparator, limit) => {
    if (comparator === "==") {
        const equalityBound: Bound = { limit, inclusive: true }
        return reduceLimit(
            reduceLimit(base, "lower", equalityBound),
            "upper",
            equalityBound
        )
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
    base: Attributes,
    kind: BoundKind,
    bound: Bound
): Attributes => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = base.bounds?.[kind]
    const baseOpposing = base.bounds?.[invertedKind]
    if (baseCompeting && !isStricter(kind, bound, baseCompeting)) {
        return base
    }
    if (baseOpposing && isStricter(invertedKind, bound, baseOpposing)) {
        return reduceType(base, "never")
    }
    return {
        ...base,
        bounds: {
            [kind]: bound,
            [invertedKind]: baseOpposing
        }
    }
}
