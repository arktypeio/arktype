import type { nominal } from "../internal.js"
import type { EmptyIntersectionResult, Intersector } from "./intersection.js"

export const intersectBounds: Intersector<"bounds"> = (base, value) => {
    let updatableBounds = parseBounds(base)
    const { min, max } = parseBounds(value)
    if (min) {
        const result = intersectBound("min", updatableBounds, min)
        if (Array.isArray(result)) {
            return result
        }
        updatableBounds = result
    }
    if (max) {
        const result = intersectBound("max", updatableBounds, max)
        if (Array.isArray(result)) {
            return result
        }
        updatableBounds = result
    }
    return stringifyBounds(updatableBounds)
}

export type BoundsString = nominal<string, "BoundsString">

export type BoundsData = {
    min?: BoundData
    max?: BoundData
}

export type BoundData = {
    limit: number
    inclusive: boolean
}

export const stringifyBounds = (boundsData: BoundsData) =>
    JSON.stringify(boundsData) as BoundsString

const parseBounds = (boundsString: BoundsString) =>
    JSON.parse(boundsString) as BoundsData

const intersectBound = (
    kind: BoundKind,
    base: BoundsData,
    bound: BoundData
): BoundsData | EmptyIntersectionResult<"bounds"> => {
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
): EmptyIntersectionResult<"bounds"> => [
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
