import { throwInternalError } from "../utils/errors.js"
import type { xor } from "../utils/generics.js"
import type {
    ComparisonState,
    CompilationState,
    CompiledAssertion,
    Disjoint
} from "./node.js"
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

export type RangeConstraint<comparator extends Comparator = Comparator> = {
    limit: number
    comparator: comparator
}

export type Range =
    | [RangeConstraint]
    | [min: RangeConstraint, max: RangeConstraint]

export class RangeNode extends Node<typeof RangeNode> {
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
        super(RangeNode, range)
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
            .join(" && ") as CompiledAssertion
    }

    static #compileAssertion(constraint: RangeConstraint): CompiledAssertion {
        const size = "(data.length ?? data)"
        return `${size} ${
            constraint.comparator === "==" ? "===" : constraint.comparator
        } ${constraint.limit}`
    }

    compileTraversal(s: CompilationState) {
        return this.range
            .map((constraint) =>
                s.ifNotThen(
                    RangeNode.#compileAssertion(constraint),
                    s.problem("range", constraint)
                )
            )
            .join("\n")
    }

    static intersect(
        l: RangeNode,
        r: RangeNode,
        s: ComparisonState
    ): RangeNode | Disjoint {
        if (l.isEqualityRange()) {
            if (r.isEqualityRange()) {
                return l === r ? l : s.addDisjoint("range", l, r)
            }
            return r.allows(l.bounds["=="]) ? l : s.addDisjoint("range", l, r)
        }
        if (r.isEqualityRange()) {
            return l.allows(r.bounds["=="]) ? r : s.addDisjoint("range", l, r)
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
                          ...l.#extractComparators(">"),
                          ...r.#extractComparators("<")
                      })
            }
            return r
        }
        return stricterMax === "l" ? l : r
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
