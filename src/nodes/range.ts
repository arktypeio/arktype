import { throwInternalError } from "../utils/errors.js"
import type { evaluate, xor } from "../utils/generics.js"
import { stringify } from "../utils/serialize.js"
import type { ComparisonState, CompilationState } from "./node.js"
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
    constructor(rule: Bounds) {
        super(RangeNode, rule)
    }

    static compile(rule: Bounds, c: CompilationState) {
        const comparatorEntries = Object.entries(rule) as [Comparator, number][]
        if (comparatorEntries.length === 0 || comparatorEntries.length > 2) {
            return throwInternalError(
                `Unexpected comparators: ${stringify(rule)}`
            )
        }
        const sizeAssignment = `const size = ${
            c.lastDomain === "number" ? c.data : `${c.data}.length`
        };` as const
        const units =
            c.lastDomain === "string"
                ? "characters"
                : c.lastDomain === "object"
                ? "items long"
                : ""
        const checks = comparatorEntries
            .map(([comparator, limit]) =>
                c.check("range", `size ${comparator} ${limit}`, {
                    comparator,
                    limit,
                    units
                })
            )
            .join(" && ")
        return `${sizeAssignment}${checks}`
    }

    static intersection(l: RangeNode, r: RangeNode, s: ComparisonState) {
        if (l.isEqualityRange()) {
            if (r.isEqualityRange()) {
                return l.child["=="] === r.child["=="]
                    ? l
                    : s.addDisjoint("range", l, r)
            }
            return r(l.child["=="]) ? l : s.addDisjoint("range", l, r)
        }
        if (r.isEqualityRange()) {
            return l(r.child["=="]) ? r : s.addDisjoint("range", l, r)
        }
        const stricterMin = compareStrictness("min", l.lowerBound, r.lowerBound)
        const stricterMax = compareStrictness("max", l.upperBound, r.upperBound)
        if (stricterMin === "l") {
            if (stricterMax === "r") {
                return compareStrictness("min", l.lowerBound, r.upperBound) ===
                    "l"
                    ? s.addDisjoint("range", l, r)
                    : new RangeNode({
                          ...l.#extractComparators(">"),
                          ...r.#extractComparators("<")
                      })
            }
            return l
        }
        if (stricterMin === "r") {
            if (stricterMax === "l") {
                return compareStrictness("max", l.upperBound, r.lowerBound) ===
                    "l"
                    ? s.addDisjoint("range", l, r)
                    : new RangeNode({
                          ...r.#extractComparators(">"),
                          ...l.#extractComparators("<")
                      })
            }
            return r
        }
        return stricterMax === "l" ? l : r
    }

    isEqualityRange(): this is { rule: { "==": number } } {
        return this.child["=="] !== undefined
    }

    getComparator(
        comparator: MinComparator | MaxComparator
    ): BoundContext | undefined {
        if (this.child[comparator] !== undefined) {
            return {
                limit: this.child[comparator]!,
                comparator
            }
        }
    }

    get lowerBound() {
        return this.getComparator(">") ?? this.getComparator(">=")
    }

    get upperBound() {
        return this.getComparator("<") ?? this.getComparator("<=")
    }

    #extractComparators(prefix: ">" | "<") {
        return this.child[prefix] !== undefined
            ? { [prefix]: this.child[">"] }
            : this.child[`${prefix}=`] !== undefined
            ? { [`${prefix}=`]: this.child[`${prefix}=`] }
            : {}
    }

    toString(): string {
        if (this.isEqualityRange()) {
            return `the range of exactly ${this.child["=="]}`
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

const compareStrictness = (
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
