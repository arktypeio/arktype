import { Scanner } from "../../parse/string/shift/scanner.ts"
import type { SizedData } from "../../utils/data.ts"
import type { evaluate, xor } from "../../utils/generics.ts"
import type { Path } from "../../utils/paths.ts"
import type { Compilation } from "../compile.ts"
import { composeIntersection, equality } from "../compose.ts"
import { Problem } from "../problems.ts"

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

export type BoundWithUnits = Bound & { units: string | undefined }

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

export const compileRange = (range: Range, c: Compilation) =>
    isEqualityRange(range)
        ? rangeLinesFrom(c, range)
        : range.min
        ? range.max
            ? rangeLinesFrom(c, range.min, range.max)
            : rangeLinesFrom(c, range.min)
        : rangeLinesFrom(c, range.max)

type RangeLines = evaluate<[CompiledSizeAssignment, ...CompiledBoundCheck[]]>

const compileSizeAssignment = (data: string) =>
    `const size = typeof ${data} === "number" ? ${data} : ${data}.length` as const

type CompiledSizeAssignment = ReturnType<typeof compileSizeAssignment>

const rangeLinesFrom = (c: Compilation, ...bounds: Bound[]) =>
    [
        compileSizeAssignment(c.data),
        ...bounds.map((bound) => compileBoundCheck(bound, c))
    ] as RangeLines

const compileBoundCheck = (bound: Bound, c: Compilation) =>
    c.check("range", `size ${bound.comparator} ${bound.limit}`, bound)

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

export class RangeProblem extends Problem<SizedData> {
    readonly code = "range"

    constructor(
        public comparator: Scanner.Comparator,
        public limit: number,
        data: SizedData,
        path: Path
    ) {
        super(data, path)
    }

    get mustBe() {
        return `${Scanner.comparatorDescriptions[this.comparator]} ${
            this.limit
        }${this.data.units ? ` ${this.data.units}` : ""}`
    }

    get was() {
        return `${this.data.size}`
    }
}
