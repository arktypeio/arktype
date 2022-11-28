import { isEmpty } from "../../utils/deepEquals.js"
import {
    createSubcomparison,
    initializeComparison,
    initializeSubcomparison
} from "./utils.js"

export type Bounds = {
    readonly min?: Bound
    readonly max?: Bound
}

export type Bound = {
    readonly limit: number
    readonly exclusive?: true
}

type BoundableAttributes = { bounds?: Bounds }

export const addBoundsComparison = createSubcomparison<
    BoundableAttributes,
    "bounds"
>("bounds", (l, r) => {
    const subcomparison = initializeSubcomparison<Bounds>()
    const stricterMin = compareStrictness(l.min, r.min, "min")
    if (stricterMin === "l") {
        subcomparison[0].min = l.min!
        subcomparison[1].min = l.min!
    } else if (stricterMin === "r") {
        subcomparison[1].min = r.min!
        subcomparison[2].min = r.min!
    } else if (l.min) {
        subcomparison[1].min = l.min
    }
    const stricterMax = compareStrictness(l.max, r.max, "max")
    if (stricterMax === "l") {
        subcomparison[0].max = l.max!
        subcomparison[1].max = l.max!
    } else if (stricterMax === "r") {
        subcomparison[1].max = r.max!
        subcomparison[2].max = r.max!
    } else if (l.max) {
        subcomparison[1].max = l.max
    }
    const rangeIsEmpty =
        subcomparison[1].min &&
        subcomparison[1].max &&
        compareStrictness(subcomparison[1].min, subcomparison[1].max, "min") ===
            "l"
    return [
        isEmpty(subcomparison[0]) ? null : subcomparison[0],
        rangeIsEmpty ? null : subcomparison[1],
        isEmpty(subcomparison[2]) ? null : subcomparison[2]
    ]
})

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
