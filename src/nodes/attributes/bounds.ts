import type { array } from "../../utils/generics.js"

export type Bounds = {
    readonly min?: Bound
    readonly max?: Bound
}

export type Bound = {
    readonly limit: number
    readonly exclusive?: true
}

export const boundsIntersection = (l: Bounds, r: Bounds): Bounds | null => {
    const min =
        r.min && (!l.min || compareStrictness(l.min, r.min, "min") === "r")
            ? r.min
            : l.min
    const max =
        r.max && (!l.max || compareStrictness(l.max, r.max, "max") === "r")
            ? r.max
            : l.max
    return min
        ? max
            ? compareStrictness(min, max, "min") === "l"
                ? null
                : { min, max }
            : { min }
        : { max: max! }
}

type BoundableData = number | string | array

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

export const buildEmptyRangeMessage = (
    kind: BoundKind,
    bound: Bound,
    opposing: Bound
) =>
    `the range bounded by ${stringifyBound(
        "min",
        kind === "min" ? bound : opposing
    )} and ${stringifyBound("max", kind === "max" ? bound : opposing)} is empty`

const stringifyBound = (kind: BoundKind, bound: Bound) =>
    `${kind === "min" ? "<" : ">"}${bound.exclusive ? "" : "="}${bound.limit}`

const invertedKinds = {
    min: "max",
    max: "min"
} as const

type BoundKind = keyof typeof invertedKinds

const compareStrictness = (l: Bound, r: Bound, kind: BoundKind) =>
    l.limit === r.limit
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
