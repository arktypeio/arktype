import type { Scanner } from "../../parse/string/shift/scanner.ts"
import type { TraversalCheck } from "../../traverse/traverse.ts"
import { sizeOf } from "../../utils/domains.ts"
import { composeIntersection, equality, toComparator } from "../compose.ts"
import type { FlattenAndPushRule } from "./rules.ts"

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

export type FlatBound = {
    comparator: Scanner.Comparator
    limit: number
    units: string
}

// TODO: flatten to individual comparators
export const flattenRange: FlattenAndPushRule<Range> = (
    entries,
    range,
    ctx
) => {
    const units =
        ctx.domain === "string"
            ? "characters"
            : ctx.domain === "object"
            ? "items"
            : ""
    if (range.min) {
        if (range.min.limit === range.max?.limit) {
            return entries.push([
                "range",
                { comparator: "==", limit: range.min.limit, units }
            ])
        }
        entries.push([
            "range",
            {
                comparator: toComparator("min", range.min),
                limit: range.min.limit,
                units
            }
        ])
    }
    if (range.max) {
        entries.push([
            "range",
            {
                comparator: toComparator("max", range.max),
                limit: range.max.limit,
                units
            }
        ])
    }
}

export const checkRange = ((data, bound, state) => {
    if (!comparatorCheckers[bound.comparator](sizeOf(data), bound.limit)) {
        state.problems.add("range", data, bound)
    }
}) satisfies TraversalCheck<"range">

const comparatorCheckers: Record<
    Scanner.Comparator,
    (size: number, limit: number) => boolean
> = {
    "<": (size, limit) => size < limit,
    ">": (size, limit) => size > limit,
    "<=": (size, limit) => size <= limit,
    ">=": (size, limit) => size >= limit,
    "==": (size, limit) => size === limit
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
