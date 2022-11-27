import { isEmpty } from "../utils/deepEquals.js"
import type { Never } from "./types/degenerate.js"

export type Bounds = {
    readonly min?: Bound
    readonly max?: Bound
}

export type Bound = {
    readonly limit: number
    readonly exclusive?: true
}

export const boundsIntersection = (l: Bounds, r: Bounds): Bounds | Never => {
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
                ? {
                      never: buildEmptyRangeMessage("min", min, max)
                  }
                : { min, max }
            : { min }
        : { max: max! }
}

export const pruneBounds = (l: Bounds, r: Bounds): Bounds | undefined => {
    const result = { ...l }
    if (l.min && r.min && compareStrictness(l.min, r.min, "min") !== "l") {
        delete result.min
    }
    if (l.max && r.max && compareStrictness(l.max, r.max, "max") !== "l") {
        delete result.max
    }
    if (!isEmpty(result)) {
        return result
    }
}

export const checkBounds = (bounds: Bounds, data: number) => {
    if (bounds.min) {
        if (
            data < bounds.min.limit ||
            (data === bounds.min.limit && bounds.min.exclusive)
        ) {
            return false
        }
    }
    if (bounds.max) {
        if (
            data > bounds.max.limit ||
            (data === bounds.max.limit && bounds.max.exclusive)
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
