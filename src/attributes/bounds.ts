import type { EmptyIntersectionResult, Intersector } from "./intersection.js"
import { isEmptyIntersection } from "./intersection.js"

export const intersectBounds: Intersector<"bounds"> = (base, { min, max }) => {
    let intersectedBounds: BoundsData | EmptyIntersectionResult<BoundsData> =
        base
    if (min) {
        intersectedBounds = intersectBound("min", base, min)
        if (isEmptyIntersection(intersectedBounds)) {
            return intersectedBounds
        }
    }
    if (max) {
        intersectedBounds = intersectBound("max", base, max)
    }
    return intersectedBounds
}

export type BoundsData = {
    min?: BoundData
    max?: BoundData
}

export type BoundData = {
    limit: number
    inclusive: boolean
}

const intersectBound = (
    kind: BoundKind,
    base: BoundsData,
    bound: BoundData
): BoundsData | EmptyIntersectionResult<BoundsData> => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = base[kind]
    const baseOpposing = base[invertedKind]
    if (baseOpposing && isStricter(kind, bound, baseOpposing)) {
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
): EmptyIntersectionResult<BoundsData> => [
    { [invertedKinds[kind]]: baseOpposing },
    {
        [kind]: bound
    }
]

const invertedKinds = {
    min: "max",
    max: "min"
} as const

type BoundKind = keyof typeof invertedKinds

const isStricter = (kind: BoundKind, candidate: BoundData, base: BoundData) => {
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
