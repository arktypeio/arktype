import { isEmpty } from "../utils/deepEquals.js"
import { defineOperations } from "./attributes.js"

export type Bounds = {
    readonly min?: Bound
    readonly max?: Bound
}

export type Bound = {
    readonly limit: number
    readonly exclusive?: true
}

export const bounds = defineOperations<Bounds>()({
    intersection: (a, b) => {
        const min =
            b.min && (!a.min || compareStrictness("min", a.min, b.min) === "b")
                ? b.min
                : a.min
        const max =
            b.max && (!a.max || compareStrictness("max", a.max, b.max) === "b")
                ? b.max
                : a.max
        return min
            ? max
                ? compareStrictness("min", min, max) === "a" ||
                  compareStrictness("max", min, max) === "b"
                    ? null
                    : { min, max }
                : { min }
            : max
            ? { max }
            : {}
    },
    difference: ({ ...a }, b) => {
        if (a.min && b.min && compareStrictness("min", a.min, b.min) !== "a") {
            delete a.min
        }
        if (a.max && b.max && compareStrictness("max", a.max, b.max) !== "a") {
            delete a.max
        }
        return isEmpty(a) ? undefined : a
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

const compareStrictness = (kind: BoundKind, a: Bound, b: Bound) =>
    a.limit === b.limit
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
