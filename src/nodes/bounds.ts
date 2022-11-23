import { isEmpty } from "../utils/deepEquals.js"
import { SetOperations } from "./shared.js"

export type Bounds = {
    readonly min?: Bound
    readonly max?: Bound
}

export type Bound = {
    readonly limit: number
    readonly exclusive?: true
}

export const boundsOperations = {
    "&": (l, r) => {
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
    "-": (l, r) => {
        const result = { ...l }
        if (l.min && r.min && compareStrictness(l.min, r.min, "min") !== "l") {
            delete result.min
        }
        if (l.max && r.max && compareStrictness(l.max, r.max, "max") !== "l") {
            delete result.max
        }
        return isEmpty(result) ? null : result
    }
} satisfies SetOperations<Bounds>

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
