import type { Nominal } from "../internal.js"
import type { Contradiction, IntersectionReducer } from "./shared.js"
import { isContradiction } from "./shared.js"

export const intersectBounds: IntersectionReducer<"bounds"> = (base, value) => {
    let updatableBounds = parseBounds(base)
    const { min, max } = parseBounds(value)
    if (min) {
        const result = intersectBound("min", updatableBounds, min)
        if (isContradiction(result)) {
            return result
        }
        updatableBounds = result
    }
    if (max) {
        const result = intersectBound("max", updatableBounds, max)
        if (isContradiction(result)) {
            return result
        }
        updatableBounds = result
    }
    return stringifyBounds(updatableBounds)
}

export type BoundsString = Nominal<string, "BoundsString">

type BoundsData = {
    min?: BoundData
    max?: BoundData
}

type BoundData = {
    limit: number
    inclusive: boolean
}

const stringifyBounds = (boundsData: BoundsData) =>
    JSON.stringify(boundsData) as BoundsString

const parseBounds = (boundsString: BoundsString) =>
    JSON.parse(boundsString) as BoundsData

const intersectBound = (
    kind: BoundKind,
    base: BoundsData,
    bound: BoundData
): BoundsData | Contradiction<"bounds"> => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = base[kind]
    const baseOpposing = base[invertedKind]
    if (baseOpposing && isStricter(invertedKind, bound, baseOpposing)) {
        return createBoundsContradiction(kind, baseOpposing, bound)
    }
    if (!baseCompeting || isStricter(kind, bound, baseCompeting)) {
        base[kind] = bound
    }
    return base
}

const createBoundsContradiction = (
    kind: BoundKind,
    baseOpposing: BoundData,
    bound: BoundData
): Contradiction<"bounds"> => ({
    key: "bounds",
    base: stringifyBounds({ [invertedKinds[kind]]: baseOpposing }),
    conflicting: stringifyBounds({
        [kind]: bound
    })
})

const invertedKinds = {
    min: "max",
    max: "min"
} as const

type BoundKind = keyof typeof invertedKinds

const isStricter = (
    kind: BoundKind,
    candidateBound: BoundData,
    baseBound: BoundData
) => {
    if (
        candidateBound.limit === baseBound.limit &&
        candidateBound.inclusive === false &&
        baseBound.inclusive === true
    ) {
        return true
    } else if (kind === "min") {
        return candidateBound.limit > baseBound.limit
    } else {
        return candidateBound.limit < baseBound.limit
    }
}
