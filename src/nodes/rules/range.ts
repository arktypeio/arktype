import type { Scanner } from "../../parse/string/shift/scanner.ts"
import { sizeOf } from "../../utils/data.ts"
import type { evaluate } from "../../utils/generics.ts"
import { composeIntersection, equality } from "../compose.ts"
import type { RuleCompiler } from "./rules.ts"

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

export const compileRange: RuleCompiler<Range> = (range, state) => {
    const assignSize =
        `const size = typeof data === "number" ? data : data.length` as const
    const units =
        `typeof data === "string" ? "characters" : Array.isArray(data) ? "items" : ""` as const
    if (isEqualityRange(range)) {
        return `${assignSize};size === ${
            range.limit
        } || ${state.precompileProblem(
            "size",
            `{ comparator: "===", limit: ${range.limit}, units: ${units}}`
        )}` as const
    }
    if (range.min) {
        if (range.max) {
        } else {
        }
    } else if (range.max) {
    }
    return ""

    const sizeIsAllowed = isEqualityRange(range)
        ? (`size === ${range.limit}` as const)
        : range.min
        ? range.max
            ? (`(size ${range.min.comparator} ${range.min.limit} && size ${range.max.comparator} ${range.max.limit})` as const)
            : (`size ${range.min.comparator} ${range.min.limit}` as const)
        : range.max
        ? (`size ${range.max.comparator} ${range.max.limit}` as const)
        : undefined
    if (!sizeIsAllowed) {
        return ""
    }

    return `${assignSize};${sizeIsAllowed} || ${state.precompileProblem(
        "bound"
    )}`
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
