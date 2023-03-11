import type { Scanner } from "../../parse/string/shift/scanner.ts"
import type { evaluate, xor } from "../../utils/generics.ts"
import type { CompilationState } from "../compile.ts"
import { composeIntersection, equality } from "../compose.ts"

export type Range = RelativeRange | Bound<"==">

// disallow empty object
type RelativeRange =
    | { min: LowerBound; max: UpperBound }
    | xor<
          {
              min: LowerBound
          },
          {
              max: UpperBound
          }
      >

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

const minAllows = (min: LowerBound | undefined, n: number) =>
    !min || n > min.limit || (n === min.limit && !isExclusive(min.comparator))

const maxAllows = (max: UpperBound | undefined, n: number) =>
    !max || n < max.limit || (n === max.limit && !isExclusive(max.comparator))

export const compileRangeLines = (range: Range, state: CompilationState) =>
    isEqualityRange(range)
        ? rangeLinesFrom(state, range)
        : range.min
        ? range.max
            ? rangeLinesFrom(state, range.min, range.max)
            : rangeLinesFrom(state, range.min)
        : rangeLinesFrom(state, range.max)

type RangeLines = evaluate<[CompiledSizeAssignment, ...CompiledBoundCheck[]]>

const compiledSizeAssignment =
    `const size = typeof data === "number" ? data : data.length` as const

type CompiledSizeAssignment = typeof compiledSizeAssignment

const rangeLinesFrom = (state: CompilationState, ...bounds: Bound[]) =>
    [
        compiledSizeAssignment,
        ...bounds.map((bound) => compileBoundCheck(bound, state))
    ] as RangeLines

const compileBoundCheck = (bound: Bound, state: CompilationState) =>
    // cast to "<comparator>" so the return type is easier to read
    `size ${bound.comparator as "<comparator>"} ${
        bound.limit
    } || ${state.precompileProblem(
        "size",
        `{ comparator: '${bound.comparator as "<comparator>"}', limit: ${
            bound.limit
        } }`
    )}` as const

type CompiledBoundCheck = ReturnType<typeof compileBoundCheck>

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
