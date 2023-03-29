import { throwInternalError } from "../../utils/errors.ts"
import type { evaluate, xor } from "../../utils/generics.ts"
import { stringify } from "../../utils/serialize.ts"
import type { ComparisonState, Compilation } from "../node.ts"
import { Rule } from "./rule.ts"

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

export type Bounds = xor<{ "==": number }, LowerBound & UpperBound>

export type LowerBound = xor<{ ">"?: number }, { ">="?: number }>

export type UpperBound = xor<{ "<"?: number }, { "<="?: number }>

export type BoundContext = {
    limit: number
    comparator: Comparator
}

export type BoundContextWithUnits = evaluate<BoundContext & { units: string }>

export class RangeRule extends Rule<"range"> {
    constructor(public bounds: Bounds) {
        super(
            "range",
            // TODO: sort
            JSON.stringify(bounds)
        )
    }

    intersect(other: RangeRule, s: ComparisonState) {
        if (this.isEqualityRange()) {
            if (other.isEqualityRange()) {
                return this.bounds["=="] === other.bounds["=="]
                    ? this
                    : s.addDisjoint("range", this, other)
            }
            return other.allows(this.bounds["=="])
                ? this
                : s.addDisjoint("range", this, other)
        }
        if (other.isEqualityRange()) {
            return this.allows(other.bounds["=="])
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
                    : new RangeRule({
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
                    : new RangeRule({
                          ...other.#extractComparators(">"),
                          ...this.#extractComparators("<")
                      })
            }
            return other
        }
        return stricterMax === "l" ? this : other
    }

    compile(c: Compilation): string {
        const comparatorEntries = Object.entries(this.bounds) as [
            Comparator,
            number
        ][]
        if (comparatorEntries.length === 0 || comparatorEntries.length > 2) {
            return throwInternalError(
                `Unexpected comparators: ${stringify(this.bounds)}`
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

    isEqualityRange(): this is { comparators: { "==": number } } {
        return this.bounds["=="] !== undefined
    }

    getBound(
        comparator: MinComparator | MaxComparator
    ): BoundContext | undefined {
        if (this.bounds[comparator] !== undefined) {
            return {
                limit: this.bounds[comparator]!,
                comparator
            }
        }
    }

    get lowerBound() {
        return this.getBound(">") ?? this.getBound(">=")
    }

    get upperBound() {
        return this.getBound("<") ?? this.getBound("<=")
    }

    #extractComparators(prefix: ">" | "<") {
        return this.bounds[prefix] !== undefined
            ? { [prefix]: this.bounds[">"] }
            : this.bounds[`${prefix}=`] !== undefined
            ? { [`${prefix}=`]: this.bounds[`${prefix}=`] }
            : {}
    }

    toString() {
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
