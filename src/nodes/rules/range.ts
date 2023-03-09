import type { Scanner } from "../../parse/string/shift/scanner.ts"
import type { evaluate } from "../../utils/generics.ts"
import type { CompilationState } from "../compile.ts"
import { composeIntersection, equality } from "../compose.ts"

export type Range = RelativeRange | Bound<"==">

type RelativeRange<
    min extends LowerBound = LowerBound,
    max extends UpperBound = UpperBound
> = {
    min?: min
    max?: max
}

export type BoundKind = evaluate<keyof RelativeRange>

export const minComparators = {
    ">": true,
    ">=": true
} as const

export type MinComparator = keyof typeof minComparators

export type LowerBound<comparator extends MinComparator = MinComparator> =
    Bound<comparator>

export const maxComparators = {
    "<": true,
    "<=": true
} as const

export type MaxComparator = keyof typeof maxComparators

export type UpperBound<comparator extends MaxComparator = MaxComparator> =
    Bound<comparator>

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

const minAllows = (min: RelativeRange["min"], n: number) =>
    !min || n > min.limit || (n === min.limit && !isExclusive(min.comparator))

const maxAllows = (max: RelativeRange["max"], n: number) =>
    !max || n < max.limit || (n === max.limit && !isExclusive(max.comparator))

export type FlatBound = evaluate<Bound & { units?: string }>

export const compileRange = <range extends Range>(
    range: range,
    state: CompilationState
) => {
    const assignSize =
        `const size = typeof data === "number" ? data : data.length;` as const
    return `${assignSize}${
        isEqualityRange(range)
            ? compileBoundCheck(range, state)
            : compileRelativeRangeChecks(range, state)
    }` as const
}

const compileRelativeRangeChecks = <
    minComparator extends MinComparator,
    maxComparator extends MaxComparator
>(
    range: RelativeRange<LowerBound<minComparator>, UpperBound<maxComparator>>,
    state: CompilationState
) =>
    `${range.min ? compileBoundCheck(range.min, state) : ""}${
        range.max ? compileBoundCheck(range.max, state) : ""
    }` as const

const compileBoundCheck = <comparator extends Scanner.Comparator>(
    bound: Bound<comparator>,
    state: CompilationState
) =>
    `size ${bound.comparator} ${bound.limit} || ${state.precompileProblem(
        "size",
        `{ comparator: '${bound.comparator}', limit: ${bound.limit} }`
    )};` as const

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
