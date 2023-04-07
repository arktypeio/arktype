import type { Scanner } from "../../parse/string/shift/scanner.js"
import type { EntryChecker } from "../../traverse/traverse.js"
import { sizeOf } from "../../utils/data.js"
import type { evaluate } from "../../utils/generics.js"
import { composeIntersection, equality } from "../compose.js"
import type { FlattenAndPushRule } from "./rules.js"

export type Range = DoubleBound | Bound<"==">

export type DoubleBound = {
    min?: LowerBound
    max?: UpperBound
}

export type BoundKind = evaluate<keyof DoubleBound>

export const minComparators = {
    ">": true,
    ">=": true
} as const

export type MinComparator = keyof typeof minComparators

export type LowerBound = Bound<MinComparator>

export const maxComparators = {
    "<": true,
    "<=": true
} as const

export type MaxComparator = keyof typeof maxComparators

export type UpperBound = Bound<MaxComparator>

export type Bound<comparator extends Scanner.Comparator = Scanner.Comparator> =
    {
        readonly comparator: comparator
        readonly limit: number
    }

export const isEqualityRange = (range: Range): range is Bound<"=="> =>
    "comparator" in range

export const rangeIntersection = composeIntersection<Range>((l, r, state) => {
    if (isEqualityRange(l)) {
        if (isEqualityRange(r)) {
            return l.limit === r.limit
                ? equality()
                : state.addDisjoint("range", l, r)
        }
        return rangeAllows(r, l.limit) ? l : state.addDisjoint("range", l, r)
    }
    if (isEqualityRange(r)) {
        return rangeAllows(l, r.limit) ? r : state.addDisjoint("range", l, r)
    }
    const stricterMin = compareStrictness("min", l.min, r.min)
    const stricterMax = compareStrictness("max", l.max, r.max)
    if (stricterMin === "l") {
        if (stricterMax === "r") {
            return compareStrictness("min", l.min!, r.max!) === "l"
                ? state.addDisjoint("range", l, r)
                : {
                      min: l.min!,
                      max: r.max!
                  }
        }
        return l
    }
    if (stricterMin === "r") {
        if (stricterMax === "l") {
            return compareStrictness("max", l.max!, r.min!) === "l"
                ? state.addDisjoint("range", l, r)
                : {
                      min: r.min!,
                      max: l.max!
                  }
        }
        return r
    }
    return stricterMax === "l" ? l : stricterMax === "r" ? r : equality()
})

const rangeAllows = (range: Range, n: number) =>
    isEqualityRange(range)
        ? n === range.limit
        : minAllows(range.min, n) && maxAllows(range.max, n)

const minAllows = (min: DoubleBound["min"], n: number) =>
    !min || n > min.limit || (n === min.limit && !isExclusive(min.comparator))

const maxAllows = (max: DoubleBound["max"], n: number) =>
    !max || n < max.limit || (n === max.limit && !isExclusive(max.comparator))

export type FlatBound = evaluate<Bound & { units?: string }>

export const flattenRange: FlattenAndPushRule<Range> = (
    entries,
    range,
    ctx
) => {
    const units =
        ctx.lastDomain === "string"
            ? "characters"
            : ctx.lastDomain === "object"
            ? "items long"
            : undefined
    if (isEqualityRange(range)) {
        return entries.push(["bound", units ? { ...range, units } : range])
    }
    if (range.min) {
        entries.push(["bound", units ? { ...range.min, units } : range.min])
    }
    if (range.max) {
        entries.push(["bound", units ? { ...range.max, units } : range.max])
    }
}

export const checkBound: EntryChecker<"bound"> = (bound, state) =>
    comparatorCheckers[bound.comparator](sizeOf(state.data), bound.limit) ||
    !state.problems.add("bound", bound)

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

export const compareStrictness = (
    kind: "min" | "max",
    l: Bound | undefined,
    r: Bound | undefined
) =>
    !l
        ? !r
            ? "="
            : "r"
        : !r
        ? "l"
        : l.limit === r.limit
        ? isExclusive(l.comparator)
            ? isExclusive(r.comparator)
                ? "="
                : "l"
            : isExclusive(r.comparator)
            ? "r"
            : "="
        : kind === "min"
        ? l.limit > r.limit
            ? "l"
            : "r"
        : l.limit < r.limit
        ? "l"
        : "r"

const isExclusive = (comparator: Scanner.Comparator): comparator is ">" | "<" =>
    comparator.length === 1
