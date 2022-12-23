import type { CheckState } from "../../traverse/check.js"
import type { List } from "../../utils/generics.js"
import { composeIntersection, empty, equal } from "../compose.js"

export type Range = {
    readonly min?: Bound
    readonly max?: Bound
}

export type Bound = {
    readonly limit: number
    readonly exclusive?: true
}

export const rangeIntersection = composeIntersection<Range>((l, r) => {
    const minComparison = compareStrictness(l.min, r.min, "min")
    const maxComparison = compareStrictness(l.max, r.max, "max")
    if (minComparison === "l") {
        if (maxComparison === "r") {
            return compareStrictness(l.min!, r.max!, "min") === "l"
                ? empty
                : {
                      min: l.min!,
                      max: r.max!
                  }
        }
        return l
    }
    if (minComparison === "r") {
        if (maxComparison === "l") {
            return compareStrictness(l.max!, r.min!, "max") === "l"
                ? empty
                : {
                      min: r.min!,
                      max: l.max!
                  }
        }
        return r
    }
    return maxComparison === "l" ? l : maxComparison === "r" ? r : equal
})

export type BoundableData = number | string | List

const rangeError: Record<string, Function> = {
    min: (data: BoundableData, minBound: Bound) =>
        `Checked data:${data} must be greater than${
            minBound.exclusive ? "" : " or equal to"
        } min value:${minBound.limit}`,
    max: (data: BoundableData, maxBound: Bound) =>
        `Checked data: ${data} must be less than ${
            maxBound.exclusive ?? false ? "" : " or equal to"
        } max value:${maxBound.limit}`
}

const addRangeError = (state: CheckState, type: string, bound: Bound) => {
    state.problems.push({
        path: `[${[...state.path].join()}]`,
        reason: state.customError
            ? state.customError
            : rangeError[type](state.data, bound)
    })
}

export const checkRange = (state: CheckState<BoundableData>, range: Range) => {
    const { data } = state
    const size = typeof data === "number" ? data : data.length
    if (range.min) {
        if (
            size < range.min.limit ||
            (size === range.min.limit && range.min.exclusive)
        ) {
            addRangeError(state, "min", range.min)
        }
    }
    if (range.max) {
        if (
            size > range.max.limit ||
            (size === range.max.limit && range.max.exclusive)
        ) {
            addRangeError(state, "max", range.max)
        }
    }
}

export const buildEmptyRangeMessage = (min: Bound, max: Bound) =>
    `the range bounded by ${stringifyBound("min", min)} and ${stringifyBound(
        "max",
        max
    )} is empty`

const stringifyBound = (kind: BoundKind, bound: Bound) =>
    `${kind === "min" ? ">" : "<"}${bound.exclusive ? "" : "="}${bound.limit}`

const invertedKinds = {
    min: "max",
    max: "min"
} as const

type BoundKind = keyof typeof invertedKinds

export const compareStrictness = (
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
