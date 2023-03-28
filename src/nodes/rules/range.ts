import type { Scanner } from "../../parse/string/shift/scanner.ts"
import { throwInternalError } from "../../utils/errors.ts"
import type { xor } from "../../utils/generics.ts"
import { stringify } from "../../utils/serialize.ts"
import type { ComparisonState, Compilation } from "../node.ts"
import { RuleNode } from "./rule.ts"

export type Range = xor<
    { "==": number },
    LowerBoundComparators & UpperBoundComparators
>

type LowerBoundComparators = xor<{ ">"?: number }, { ">="?: number }>

export type Bound = {
    limit: number
    comparator: Scanner.Comparator
}

export type BoundWithUnits = Bound & { units: string }

type UpperBoundComparators = xor<{ "<"?: number }, { "<="?: number }>

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

export class RangeNode extends RuleNode<"range"> {
    constructor(public comparators: Range) {
        super(
            "range",
            // TODO: sort
            JSON.stringify(comparators)
        )
    }

    isEqualityRange(): this is { comparators: { "==": number } } {
        return this.comparators["=="] !== undefined
    }

    comparatorToBound(
        comparator: MinComparator | MaxComparator
    ): Bound | undefined {
        if (this.comparators[comparator] !== undefined) {
            return {
                limit: this.comparators[comparator]!,
                comparator
            }
        }
    }

    get lowerBound() {
        return this.comparatorToBound(">") ?? this.comparatorToBound(">=")
    }

    #extractComparators(prefix: ">" | "<") {
        return this.comparators[prefix] !== undefined
            ? { [prefix]: this.comparators[">"] }
            : this.comparators[`${prefix}=`] !== undefined
            ? { [`${prefix}=`]: this.comparators[`${prefix}=`] }
            : {}
    }

    get upperBound() {
        return this.comparatorToBound("<") ?? this.comparatorToBound("<=")
    }

    allows(size: number) {
        return size
    }

    intersect(other: RangeNode, s: ComparisonState) {
        if (this.isEqualityRange()) {
            if (other.isEqualityRange()) {
                return this.comparators["=="] === other.comparators["=="]
                    ? this
                    : s.addDisjoint("range", this, other)
            }
            return other.allows(this.comparators["=="])
                ? this
                : s.addDisjoint("range", this, other)
        }
        if (other.isEqualityRange()) {
            return this.allows(other.comparators["=="])
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
                          ...other.#extractComparators(">"),
                          ...this.#extractComparators("<")
                      })
            }
            return other
        }
        return stricterMax === "l" ? this : other
    }

    compile(c: Compilation): string {
        const comparatorEntries = Object.entries(this.comparators) as [
            Scanner.Comparator,
            number
        ][]
        if (comparatorEntries.length === 0 || comparatorEntries.length > 2) {
            return throwInternalError(
                `Unexpected comparators: ${stringify(this.comparators)}`
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

    toString() {
        if (this.isEqualityRange()) {
            return `the range of exactly ${this.comparators["=="]}`
        }
        const lower = this.lowerBound
        const upper = this.upperBound
        return lower
            ? upper
                ? `the range bounded by ${lower.comparator}${lower.limit} and ${upper.comparator}${upper.limit}`
                : `${lower.comparator}${lower.limit}`
            : upper
            ? `${upper.comparator}${upper.limit}`
            : throwInternalError(`Unexpected empty range`)
    }
}

const isExclusive = (bound: Bound) => bound.comparator[1] === "="

const compareStrictness = (
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
