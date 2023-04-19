import { throwInternalError } from "../utils/errors.js"
import type { evaluate, xor } from "../utils/generics.js"
import type { ComparisonState, CompiledAssertion, Disjoint } from "./node.js"
import { Node } from "./node.js"

export const minComparators = {
    ">": true,
    ">=": true
} as const

export type MinComparator = keyof typeof minComparators

export const maxComparators = {
    "<": true,
    "<=": true
} as const

export type MaxComparator = keyof typeof maxComparators

export const comparators = {
    ...minComparators,
    ...maxComparators,
    "==": true
}

export type Comparator = keyof typeof comparators

export const comparatorDescriptions = {
    "<": "less than",
    ">": "more than",
    "<=": "at most",
    ">=": "at least",
    "==": "exactly"
} as const satisfies Record<Comparator, string>

export const invertedComparators = {
    "<": ">",
    ">": "<",
    "<=": ">=",
    ">=": "<=",
    "==": "=="
} as const satisfies Record<Comparator, Comparator>

export type InvertedComparators = typeof invertedComparators

export type Bounds = xor<{ "==": number }, MinBounds & MaxBounds>

export type MinBounds = xor<{ ">"?: number }, { ">="?: number }>

export type MaxBounds = xor<{ "<"?: number }, { "<="?: number }>

export type BoundContext<comparator extends Comparator = Comparator> = {
    limit: number
    comparator: comparator
}

export type BoundContextWithUnits = evaluate<BoundContext & { units: string }>

export class RangeNode extends Node<typeof RangeNode> {
    readonly kind = "range"

    constructor(public bounds: Bounds) {
        super(RangeNode, bounds)
    }

    // const units =
    // s.lastDomain === "string"
    //     ? "characters"
    //     : s.lastDomain === "object"
    //     ? "items long"
    //     : ""
    static compile(bounds: Bounds): CompiledAssertion {
        const size = "(data.length ?? data)"
        if (bounds["=="] !== undefined) {
            return `${size} === ${bounds["=="]}`
        }
        const lower = extractLower(bounds)
        const compiledLower = lower
            ? (`${size} ${lower.comparator} ${lower.limit}` as const)
            : undefined
        const upper = extractUpper(bounds)
        const compiledUpper = upper
            ? (`${size} ${upper.comparator} ${upper.limit}` as const)
            : undefined
        return compiledLower
            ? compiledUpper
                ? `${compiledLower} && ${compiledUpper}`
                : compiledLower
            : compiledUpper ?? throwInternalError(`Unexpected unbounded range`)
    }

    intersect(other: RangeNode, s: ComparisonState): RangeNode | Disjoint {
        if (this.isEqualityRange()) {
            if (other.isEqualityRange()) {
                return this === other
                    ? this
                    : s.addDisjoint("range", this, other)
            }
            return other(this.bounds["=="])
                ? this
                : s.addDisjoint("range", this, other)
        }
        if (other.isEqualityRange()) {
            return this(other.bounds["=="])
                ? other
                : s.addDisjoint("range", this, other)
        }
        const stricterMin = compareStrictness(
            "min",
            this.lowerBound,
            other.lowerBound
        )
        const stricterMax = compareStrictness(
            "max",
            this.upperBound,
            other.upperBound
        )
        if (stricterMin === "l") {
            if (stricterMax === "r") {
                return compareStrictness(
                    "min",
                    this.lowerBound,
                    other.upperBound
                ) === "l"
                    ? s.addDisjoint("range", this, other)
                    : new RangeNode({
                          ...this.#extractComparators(">"),
                          ...other.#extractComparators("<")
                      })
            }
            return this
        }
        if (stricterMin === "r") {
            if (stricterMax === "l") {
                return compareStrictness(
                    "max",
                    this.upperBound,
                    other.lowerBound
                ) === "l"
                    ? s.addDisjoint("range", this, other)
                    : new RangeNode({
                          ...this.#extractComparators(">"),
                          ...other.#extractComparators("<")
                      })
            }
            return other
        }
        return stricterMax === "l" ? this : other
    }

    isEqualityRange(): this is { rule: { "==": number } } {
        return this.bounds["=="] !== undefined
    }

    get lowerBound() {
        return extractLower(this.bounds)
    }

    get upperBound() {
        return extractUpper(this.bounds)
    }

    #extractComparators(prefix: ">" | "<") {
        return this.bounds[prefix] !== undefined
            ? { [prefix]: this.bounds[">"] }
            : this.bounds[`${prefix}=`] !== undefined
            ? { [`${prefix}=`]: this.bounds[`${prefix}=`] }
            : {}
    }

    toString(): string {
        if (this.isEqualityRange()) {
            return `the range of exactly ${this.bounds["=="]}`
        }
        const lower = this.lowerBound
        const upper = this.upperBound
        return lower
            ? upper
                ? `the range bounded by ${lower.comparator}${lower.limit} and ${upper.comparator}${upper.limit}`
                : `${lower.comparator}${lower.limit}`
            : upper
            ? `${upper.comparator}${upper.limit}`
            : throwInternalError("Unexpected empty range")
    }
}

const isExclusive = (bound: BoundContext) => bound.comparator[1] === "="

export const compareStrictness = (
    kind: "min" | "max",
    l: BoundContext | undefined,
    r: BoundContext | undefined
) =>
    !l
        ? !r
            ? "="
            : "r"
        : !r
        ? "l"
        : l.limit === r.limit
        ? isExclusive(l)
            ? isExclusive(r)
                ? "="
                : "l"
            : isExclusive(r)
            ? "r"
            : "="
        : kind === "min"
        ? l.limit > r.limit
            ? "l"
            : "r"
        : l.limit < r.limit
        ? "l"
        : "r"

const getComparator = <comparator extends MinComparator | MaxComparator>(
    bounds: Bounds,
    comparator: comparator
): BoundContext<comparator> | undefined => {
    if (bounds[comparator] !== undefined) {
        return {
            limit: bounds[comparator]!,
            comparator
        }
    }
}

const extractLower = (bounds: Bounds) =>
    getComparator(bounds, ">") ?? getComparator(bounds, ">=")

const extractUpper = (bounds: Bounds) =>
    getComparator(bounds, "<") ?? getComparator(bounds, "<=")
