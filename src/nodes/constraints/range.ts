import { isKeyOf } from "../../utils/records.js"
import { In } from "../compilation.js"
import { Disjoint } from "../disjoint.js"
import { BaseNode } from "../node.js"

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

export type SizedData = string | number | readonly unknown[] | Date

export type Bound<comparator extends Comparator = Comparator> = {
    limit: number
    comparator: comparator
}

export type Range = [Bound] | [Bound<MinComparator>, Bound<MaxComparator>]

// const units =
// s.lastDomain === "string"
//     ? "characters"
//     : s.lastDomain === "object"
//     ? "items long"
//     : ""

export class RangeNode extends BaseNode<typeof RangeNode> {
    static readonly kind = "range"

    static compile(rule: Range) {
        return [`${rule}`]
    }

    isEquality(): this is { rule: [Bound<"==">] } {
        return this.rule[0].comparator === "=="
    }

    get min() {
        return isKeyOf(this.rule[0].comparator, minComparators)
            ? (this.rule[0] as Bound<MinComparator>)
            : undefined
    }

    get max() {
        return this.rule[1] ?? isKeyOf(this.rule[0].comparator, maxComparators)
            ? (this.rule[0] as Bound<MaxComparator>)
            : undefined
    }

    private static compileBound(bound: Bound) {
        return `(${In}.length ?? Number(${In})) ${
            bound.comparator === "==" ? "===" : bound.comparator
        } ${bound.limit}`
    }

    computeIntersection(other: RangeNode): RangeNode | Disjoint {
        if (this.isEquality()) {
            if (other.isEquality()) {
                return this === other
                    ? this
                    : Disjoint.from("range", this, other)
            }
            return other.allows(this.rule[0].limit)
                ? this
                : Disjoint.from("range", this, other)
        }
        if (other.isEquality()) {
            return this.allows(other.rule[0].limit)
                ? other
                : Disjoint.from("range", this, other)
        }
        const stricterMin = compareStrictness("min", this.min, other.min)
        const stricterMax = compareStrictness("max", this.max, other.max)
        if (stricterMin === "l") {
            if (stricterMax === "r") {
                return compareStrictness("min", this.min, other.max) === "l"
                    ? Disjoint.from("range", this, other)
                    : new RangeNode([this.min!, this.max!])
            }
            return this
        }
        if (stricterMin === "r") {
            if (stricterMax === "l") {
                return compareStrictness("max", this.max, other.min) === "l"
                    ? Disjoint.from("range", this, other)
                    : new RangeNode([this.min!, other.max!])
            }
            return other
        }
        return stricterMax === "l" ? this : other
    }

    describe() {
        const left = `${this.rule[0].comparator}${this.rule[0].limit}`
        return this.rule[1]
            ? `the range bounded by ${left} and ${this.rule[1].comparator}${this.rule[1].limit}`
            : left
    }
}

// compileTraverse(s: CompilationState) {
//     return this.range
//         .map((constraint) =>
//             s.ifNotThen(
//                 RangeNode.compileAssertion(constraint),
//                 s.problem("range", constraint)
//             )
//         )
//         .join("\n")
// }

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
        ? // comparators of length 1 (<,>) are exclusive so have precedence
          l.comparator.length === 1
            ? r.comparator.length === 1
                ? "="
                : "l"
            : r.comparator.length === 1
            ? "r"
            : "="
        : kind === "min"
        ? l.limit > r.limit
            ? "l"
            : "r"
        : l.limit < r.limit
        ? "l"
        : "r"
