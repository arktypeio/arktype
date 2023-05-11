import { throwInternalError } from "../../utils/errors.js"
import type { xor } from "../../utils/records.js"
import { type CompilationState, In } from "../compilation.js"
import { Disjoint } from "../disjoint.js"
import { Node } from "../node.js"

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

export type SizedData = string | number | readonly unknown[] | Date

export type RangeConstraint<comparator extends Comparator = Comparator> = {
    limit: number
    comparator: comparator
}

export type Range =
    | [RangeConstraint]
    | [min: RangeConstraint, max: RangeConstraint]

export class RangeNode extends Node<"range"> {
    static readonly kind = "range"

    range: Range

    constructor(public bounds: Bounds) {
        let range: Range
        if (bounds["=="]) {
            range = [{ comparator: "==", limit: bounds["=="] }]
        } else {
            const lower = extractLower(bounds)
            const upper = extractUpper(bounds)
            range = lower
                ? upper
                    ? [lower, upper]
                    : [lower]
                : upper
                ? [upper]
                : throwInternalError(`Unexpected unbounded range`)
        }
        // TODO: variadic here, could pass min/max
        super("range", RangeNode.compile(range))
        this.range = range
    }

    // const units =
    // s.lastDomain === "string"
    //     ? "characters"
    //     : s.lastDomain === "object"
    //     ? "items long"
    //     : ""

    static compile(range: Range) {
        return range
            .map((constraint) => RangeNode.#compileAssertion(constraint))
            .join(" && ")
    }

    static SIZE = `(${In}.length ?? Number(${In}))` as const

    static #compileAssertion(constraint: RangeConstraint) {
        return `${RangeNode.SIZE} ${
            constraint.comparator === "==" ? "===" : constraint.comparator
        } ${constraint.limit}`
    }

    compileTraverse(s: CompilationState) {
        return this.range
            .map((constraint) =>
                s.ifNotThen(
                    RangeNode.#compileAssertion(constraint),
                    s.problem("range", constraint)
                )
            )
            .join("\n")
    }

    intersectNode(r: RangeNode): RangeNode | Disjoint {
        if (this.isEqualityRange()) {
            if (r.isEqualityRange()) {
                return this === r ? this : Disjoint.from("range", this, r)
            }
            return r.allows(this.bounds["=="])
                ? this
                : Disjoint.from("range", this, r)
        }
        if (r.isEqualityRange()) {
            return this.allows(r.bounds["=="])
                ? r
                : Disjoint.from("range", this, r)
        }
        const stricterMin = compareStrictness(
            "min",
            this.lowerBound,
            r.lowerBound
        )
        const stricterMax = compareStrictness(
            "max",
            this.upperBound,
            r.upperBound
        )
        if (stricterMin === "l") {
            if (stricterMax === "r") {
                return compareStrictness(
                    "min",
                    this.lowerBound,
                    r.upperBound
                ) === "l"
                    ? Disjoint.from("range", this, r)
                    : new RangeNode({
                          ...this.extractComparators(">"),
                          ...r.extractComparators("<")
                      })
            }
            return this
        }
        if (stricterMin === "r") {
            if (stricterMax === "l") {
                return compareStrictness(
                    "max",
                    this.upperBound,
                    r.lowerBound
                ) === "l"
                    ? Disjoint.from("range", this, r)
                    : new RangeNode({
                          ...this.extractComparators("<"),
                          ...r.extractComparators(">")
                      })
            }
            return r
        }
        return stricterMax === "l" ? this : r
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

    private extractComparators(prefix: ">" | "<") {
        return this.bounds[prefix] !== undefined
            ? { [prefix]: this.bounds[prefix] }
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

const isExclusive = (bound: RangeConstraint) => bound.comparator[1] === "="

export const compareStrictness = (
    kind: "min" | "max",
    l: RangeConstraint | undefined,
    r: RangeConstraint | undefined
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
): RangeConstraint<comparator> | undefined => {
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
