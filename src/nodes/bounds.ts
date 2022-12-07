import type { List } from "../utils/generics.js"
import type { IntersectionReducer } from "./intersection.js"

export type Bounds = {
    readonly min?: Bound
    readonly max?: Bound
}

export type Bound = {
    readonly limit: number
    readonly exclusive?: true
}

export const boundsIntersection: IntersectionReducer<Bounds> = (l, r) => {
    const minComparison = compareStrictness(l.min, r.min, "min")
    const maxComparison = compareStrictness(l.max, r.max, "max")
    if (minComparison === "l") {
        if (maxComparison === "r") {
            return {
                min: l.min!,
                max: r.max!
            }
        }
        return l
    }
    if (minComparison === "r") {
        if (maxComparison === "l") {
            return {
                min: r.min!,
                max: l.max!
            }
        }
        return r
    }
    return maxComparison === "l" ? l : maxComparison === "r" ? r : true
}

type BoundableData = number | string | List

export const checkBounds = (data: BoundableData, bounds: Bounds) => {
    const size = typeof data === "number" ? data : data.length
    if (bounds.min) {
        if (
            size < bounds.min.limit ||
            (size === bounds.min.limit && bounds.min.exclusive)
        ) {
            return false
        }
    }
    if (bounds.max) {
        if (
            size > bounds.max.limit ||
            (size === bounds.max.limit && bounds.max.exclusive)
        ) {
            return false
        }
    }
    return true
}

export const buildEmptyRangeMessage = (min: Bound, max: Bound) =>
    `the range bounded by ${stringifyBound("min", min)} and ${stringifyBound(
        "max",
        max
    )} is empty`

const stringifyBound = (kind: BoundKind, bound: Bound) =>
    `${kind === "min" ? "<" : ">"}${bound.exclusive ? "" : "="}${bound.limit}`

const invertedKinds = {
    min: "max",
    max: "min"
} as const

type BoundKind = keyof typeof invertedKinds

const compareStrictness = (
    l: Bound | undefined,
    r: Bound | undefined,
    kind: BoundKind
) =>
    !l
        ? !r
            ? "="
            : "r"
        : !r
        ? "l"
        : l.limit === r.limit
        ? l.exclusive
            ? r.exclusive
                ? "="
                : "l"
            : r.exclusive
            ? "r"
            : "="
        : kind === "min"
        ? l.limit > r.limit
            ? "l"
            : "r"
        : l.limit < r.limit
        ? "l"
        : "r"
