import { hasKeys } from "../../utils/generics.js"
import type { Subcomparison } from "./utils.js"
import { createSubcomparison, initializeSubcomparison } from "./utils.js"

export type Bounds = {
    readonly min?: Bound
    readonly max?: Bound
}

export type Bound = {
    readonly limit: number
    readonly exclusive?: true
}

type BoundableAttributes = { bounds?: Bounds | undefined }

export const subcompareBounds = createSubcomparison<
    BoundableAttributes,
    "bounds"
>("bounds", (l, r) => {
    const result = initializeSubcomparison<Bounds>()
    addBoundToSubcomparison(result, "min", l.min, r.min)
    addBoundToSubcomparison(result, "max", l.max, r.max)
    const rangeIsEmpty =
        result[1].max &&
        compareStrictness(result[1].min, result[1].max, "min") === "l"
    return [
        hasKeys(result[0]) ? result[0] : null,
        rangeIsEmpty ? null : result[1],
        hasKeys(result[2]) ? result[2] : null
    ]
})

const addBoundToSubcomparison = (
    result: Subcomparison<Bounds>,
    kind: BoundKind,
    l: Bound | undefined,
    r: Bound | undefined
) => {
    const stricter = compareStrictness(l, r, kind)
    if (stricter === "l") {
        result[0][kind] = l!
        result[1][kind] = l!
    } else if (stricter === "r") {
        result[1][kind] = r!
        result[2][kind] = r!
    } else if (l) {
        result[1][kind] = l
    }
}

export const checkBounds = (data: number, bounds: Bounds) => {
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
        ? r
            ? "r"
            : "="
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
