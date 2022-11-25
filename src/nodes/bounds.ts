import type { array } from "../utils/dataTypes.js"
import { isEmpty } from "../utils/deepEquals.js"
import { AttributeOperations } from "./shared.js"

export type Bounds = {
    readonly min?: Bound
    readonly max?: Bound
}

export type Bound = {
    readonly limit: number
    readonly exclusive?: true
}

export type BoundableData = number | string | array

export const boundsOperations = {
    intersect: (l, r) => {
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
                          degenerate: "never",
                          reason: buildEmptyRangeMessage("min", min, max)
                      }
                    : compareStrictness(min, max, "max") === "r"
                    ? {
                          degenerate: "never",
                          reason: buildEmptyRangeMessage("max", min, max)
                      }
                    : { min, max }
                : { min }
            : max
            ? { max }
            : {}
    },
    subtract: ({ ...l }, r) => {
        if (l.min && r.min && compareStrictness(l.min, r.min, "min") !== "l") {
            delete l.min
        }
        if (l.max && r.max && compareStrictness(l.max, r.max, "max") !== "l") {
            delete l.max
        }
        return isEmpty(l) ? null : l
    },
    check: (bounds, data) => {
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
} satisfies AttributeOperations<Bounds, BoundableData>

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
