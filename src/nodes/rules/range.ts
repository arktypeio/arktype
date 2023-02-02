import { Scanner } from "../../parse/string/shift/scanner.ts"
import type { TraversalCheck, TraversalState } from "../../traverse/check.ts"
import { Problem } from "../../traverse/problems.ts"
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

export const checkRange = ((data, range, state) => {
    const size = typeof data === "number" ? data : data.length
    if (range.min) {
        if (
            size < range.min.limit ||
            (size === range.min.limit && range.min.exclusive)
        ) {
            state.problems.add(new RangeProblem(range.min, "min", data, state))
        }
    }
    if (range.max) {
        if (
            size > range.max.limit ||
            (size === range.max.limit && range.max.exclusive)
        ) {
            state.problems.add(new RangeProblem(range.max, "max", data, state))
        }
    }
}) satisfies TraversalCheck<"range">

// TODO: flatten these so they can directly use comparators
export class RangeProblem extends Problem<"range"> {
    actual: number
    comparator: Scanner.Comparator
    limit: number
    units: string

    constructor(
        bound: Bound,
        boundKind: "min" | "max",
        data: BoundableData,
        state: TraversalState
    ) {
        super("range", state, data)
        this.actual = typeof data === "number" ? data : data.length
        this.comparator = toComparator(boundKind, bound)
        this.limit = bound.limit
        const subdomain = subdomainOf(data)
        this.units =
            subdomain === "string"
                ? "characters"
                : subdomain === "Array"
                ? "items"
                : ""
    }

    get description() {
        let description = `${Scanner.comparatorDescriptions[this.comparator]} ${
            this.limit
        }`
        if (this.units) {
            description += ` ${this.units}`
        }
        return description
    }
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
