import type {
    EmptyIntersectionResult,
    Intersector,
    MaybeEmptyIntersection
} from "./intersection.js"
import { isEmptyIntersection } from "./intersection.js"

export const intersectBounds: Intersector<"bounds"> = (base, { min, max }) => {
    let intersectedBounds: MaybeEmptyIntersection<BoundsAttribute> = base
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

export type BoundsAttribute = {
    readonly min?: BoundData
    readonly max?: BoundData
}

export type BoundData = {
    readonly limit: number
    readonly inclusive: boolean
}

const intersectBound = (
    kind: BoundKind,
    base: BoundsAttribute,
    bound: BoundData
): BoundsAttribute | EmptyIntersectionResult<BoundsAttribute> => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = base[kind]
    const baseOpposing = base[invertedKind]
    if (baseOpposing && isStricter(kind, bound, baseOpposing)) {
        return createBoundsContradiction(kind, baseOpposing, bound)
    }
    if (!baseCompeting || isStricter(kind, bound, baseCompeting)) {
        return { ...base, [kind]: bound }
    }
    return base
}

const createBoundsContradiction = (
    kind: BoundKind,
    baseOpposing: BoundData,
    bound: BoundData
): EmptyIntersectionResult<BoundsAttribute> => [
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
