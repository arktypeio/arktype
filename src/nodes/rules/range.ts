import { Scanner } from "../../parse/string/shift/scanner.ts"
import type {
    DataTraversalState,
    TraversalCheck
} from "../../traverse/check.ts"
import type { defineProblem } from "../../traverse/problems.ts"
import { subdomainOf } from "../../utils/domains.ts"
import type { List } from "../../utils/generics.ts"
import { composeIntersection, equality, toComparator } from "../compose.ts"

export type Range = {
    readonly min?: Bound
    readonly max?: Bound
}

export type Bound = {
    readonly limit: number
    readonly exclusive?: true
}

export const rangeIntersection = composeIntersection<Range>((l, r, state) => {
    const minComparison = compareStrictness(l.min, r.min, "min")
    const maxComparison = compareStrictness(l.max, r.max, "max")
    if (minComparison === "l") {
        if (maxComparison === "r") {
            return compareStrictness(l.min!, r.max!, "min") === "l"
                ? state.addDisjoint("range", l, r)
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
                ? state.addDisjoint("range", l, r)
                : {
                      min: r.min!,
                      max: l.max!
                  }
        }
        return r
    }
    return maxComparison === "l" ? l : maxComparison === "r" ? r : equality()
})

export type BoundableData = number | string | List

export type RangeProblemContext = defineProblem<{
    code: "range"
    data: BoundableData
    comparator: Scanner.Comparator
    limit: number
    size: number
    kind: subdomainOf<BoundableData>
}>

export const checkRange = ((data, range, state) => {
    const size = typeof data === "number" ? data : data.length
    if (range.min) {
        if (
            size < range.min.limit ||
            (size === range.min.limit && range.min.exclusive)
        ) {
            addRangeProblem(data, range.min, "min", size, state)
        }
    }
    if (range.max) {
        if (
            size > range.max.limit ||
            (size === range.max.limit && range.max.exclusive)
        ) {
            addRangeProblem(data, range.max, "max", size, state)
        }
    }
}) satisfies TraversalCheck<"range">

const addRangeProblem = (
    data: BoundableData,
    bound: Bound,
    boundKind: "min" | "max",
    size: number,
    state: DataTraversalState
) => {
    const comparator = toComparator(boundKind, bound)
    const limit = bound.limit
    const kind = subdomainOf(data)
    state.addProblem({
        code: "range",
        comparator,
        limit,
        kind,
        data,
        size,
        description: `${Scanner.comparatorDescriptions[comparator]} ${limit} ${
            kind === "string" ? "characters " : kind === "Array" ? "items " : ""
        }`
    })
}

const invertedKinds = {
    min: "max",
    max: "min"
} as const

export type BoundKind = keyof typeof invertedKinds

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
