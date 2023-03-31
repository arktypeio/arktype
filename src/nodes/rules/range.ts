import { throwInternalError } from "../../utils/errors.ts"
import type { evaluate, xor } from "../../utils/generics.ts"
import { stringify } from "../../utils/serialize.ts"
import type { ComparisonState, Compilation } from "../node.ts"
import { Node } from "../node.ts"

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

export type Range = xor<{ "==": number }, MinComparators & MaxComparators>

export type MinComparators = xor<{ ">"?: number }, { ">="?: number }>

export type MaxComparators = xor<{ "<"?: number }, { "<="?: number }>

export type Bound = {
    limit: number
    comparator: Comparator
}

export type BoundWithUnits = evaluate<Bound & { units: string }>

export class RangeNode extends Node {
    constructor(public readonly children: Range) {
        super(
            // TODO: sort
            JSON.stringify(children)
        )
    }

    intersect(other: RangeNode, s: ComparisonState) {
        if (this.isEqualityRange()) {
            if (other.isEqualityRange()) {
                return this.children["=="] === other.children["=="]
                    ? this
                    : s.addDisjoint("range", this, other)
            }
            return other.allows(this.children["=="])
                ? this
                : s.addDisjoint("range", this, other)
        }
        if (other.isEqualityRange()) {
            return this.allows(other.children["=="])
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
        const comparatorEntries = Object.entries(this.children) as [
            Comparator,
            number
        ][]
        if (comparatorEntries.length === 0 || comparatorEntries.length > 2) {
            return throwInternalError(
                `Unexpected comparators: ${stringify(this.children)}`
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
        return this.children["=="] !== undefined
    }

    getBound(comparator: MinComparator | MaxComparator): Bound | undefined {
        if (this.children[comparator] !== undefined) {
            return {
                limit: this.children[comparator]!,
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
        return this.children[prefix] !== undefined
            ? { [prefix]: this.children[">"] }
            : this.children[`${prefix}=`] !== undefined
            ? { [`${prefix}=`]: this.children[`${prefix}=`] }
            : {}
    }

    toString() {
        if (this.isEqualityRange()) {
            return `the range of exactly ${this.children["=="]}`
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
