import { isEmpty } from "../utils/deepEquals.js"
import { defineOperations } from "./attributes.js"

export type Bounds = {
    min?: Bound
    max?: Bound
}

export type Bound = {
    limit: number
    exclusive?: true
}

export const bounds = defineOperations<Bounds>()({
    intersect: (a, b) => {
        const result: Bounds = { ...a, ...b }
        if (a.min && compareStrictness(a.min, b.min, "min") === "a") {
            if (compareStrictness(a.min, b.max, "max") === "a") {
                return null
            }
            result.min = a.min
        }
        if (a.max && compareStrictness(a.max, b.max, "max") === "a") {
            if (compareStrictness(a.max, b.min, "min") === "a") {
                return null
            }
            result.max = a.max
        }
        return result
    },
    extract: (a, b) => {
        const result: Bounds = {}
        if (a.min && compareStrictness(a.min, b.min, "min") !== "b") {
            result.min = a.min
        }
        if (a.max && compareStrictness(a.max, b.max, "max") !== "b") {
            result.max = a.max
        }
        return isEmpty(result) ? null : result
    },
    exclude: (a, b) => {
        const result: Bounds = {}
        if (a.min && compareStrictness(a.min, b.min, "min") === "b") {
            result.min = a.min
        }
        if (a.max && compareStrictness(a.max, b.max, "max") === "b") {
            result.max = a.max
        }
        return isEmpty(result) ? null : result
    }
})

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

const compareStrictness = (
    a: Bound | undefined,
    b: Bound | undefined,
    kind: BoundKind
) =>
    !a
        ? b
            ? "b"
            : "="
        : !b
        ? "a"
        : a.limit === b.limit
        ? a.exclusive
            ? b.exclusive
                ? "="
                : "a"
            : b.exclusive
            ? "b"
            : "="
        : kind === "min"
        ? a.limit > b.limit
            ? "a"
            : "b"
        : a.limit < b.limit
        ? "a"
        : "b"
