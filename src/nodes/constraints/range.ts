import { throwInternalError } from "../../utils/errors.js"
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

export type SizedData = string | number | readonly unknown[] | Date

export type RangeConstraint<comparator extends Comparator = Comparator> = {
    limit: number
    comparator: comparator
}

export type Bound = {
    limit: number
    exclusive?: true
}

export type Range = {
    min?: Bound
    max?: Bound
}

export class RangeNode extends Node<"range", Range> {
    // const units =
    // s.lastDomain === "string"
    //     ? "characters"
    //     : s.lastDomain === "object"
    //     ? "items long"
    //     : ""

    static compile(range: Range) {
        return range
            .map((constraint) => RangeNode.compileAssertion(constraint))
            .join(" && ")
    }

    private static compileAssertion(constraint: RangeConstraint) {
        return `(${In}.length ?? Number(${In})) ${
            constraint.comparator === "==" ? "===" : constraint.comparator
        } ${constraint.limit}`
    }

    compileTraverse(s: CompilationState) {
        return this.rule
            .map((constraint) =>
                s.ifNotThen(
                    RangeNode.compileAssertion(constraint),
                    s.problem("range", constraint)
                )
            )
            .join("\n")
    }

    intersectNode(other: RangeNode): RangeNode | Disjoint {
        const stricterMin = compareStrictness("min", this.min, other.min)
        const stricterMax = compareStrictness("max", this.max, other.max)
        if (stricterMin === "l") {
            if (stricterMax === "r") {
                return compareStrictness("min", this.min, other.max) === "l"
                    ? Disjoint.from("range", this, other)
                    : {
                          min: this.min!,
                          max: other.max!
                      }
            }
            return this
        }
        if (stricterMin === "r") {
            if (stricterMax === "l") {
                return compareStrictness("max", this.max, other.min) === "l"
                    ? Disjoint.from("range", this, other)
                    : {
                          min: other.min!,
                          max: this.max!
                      }
            }
            return other
        }
        return stricterMax === "l" ? this : other
    }

    toString(): string {
        return this.min
            ? this.max
                ? `the range bounded by ${boundToExpression(
                      "min",
                      this.min
                  )} and ${boundToExpression("max", this.max)}`
                : boundToExpression("min", this.min)
            : this.max
            ? boundToExpression("max", this.max)
            : "the unbounded range"
    }
}

const boundToExpression = (
    kind: keyof Range,
    bound: Bound
): `${Comparator}${number}` =>
    `${kind === "min" ? ">" : "<"}${bound.exclusive ? "" : "="}${bound.limit}`

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

// private static compileAssertion(constraint: RangeConstraint) {
//     return `(${In}.length ?? Number(${In})) ${
//         constraint.comparator === "==" ? "===" : constraint.comparator
//     } ${constraint.limit}`
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
        ? l.exclusive
            ? r.exclusive
                ? "="
                : "l"
            : r.exclusive
            ? "r"
            : "="
        : kind === "min"
        ? l.limit > r.limit
            ? "l"
            : "r"
        : l.limit < r.limit
        ? "l"
        : "r"
