import { Disjoint } from "../disjoint.js"
import { defineNode } from "../node.js"

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

// const units =
// s.lastDomain === "string"
//     ? "characters"
//     : s.lastDomain === "object"
//     ? "items long"
//     : ""

export type RangeNode = ReturnType<typeof RangeNode>

export const RangeNode = defineNode(
    (rule: Range) => [`${rule}`],
    // TODO: look into circularity with disjoints
    (l, r) => {
        const lMin = l.rule.min
        const lMax = l.rule.max
        const rMin = r.rule.min
        const rMax = r.rule.max
        const stricterMin = compareStrictness("min", lMin, rMin)
        const stricterMax = compareStrictness("max", lMax, rMax)
        if (stricterMin === "l") {
            if (stricterMax === "r") {
                return compareStrictness("min", lMin, rMax) === "l"
                    ? Disjoint.from("range", l, r)
                    : {
                          min: lMin!,
                          max: rMax!
                      }
            }
            return l
        }
        if (stricterMin === "r") {
            if (stricterMax === "l") {
                return compareStrictness("max", lMax, rMin) === "l"
                    ? Disjoint.from("range", l, r)
                    : {
                          min: rMin,
                          max: lMax
                      }
            }
            return r
        }
        return stricterMax === "l" ? l : r
    },
    (base) =>
        class extends base {
            readonly kind = "range"

            describe() {
                return this.rule.min
                    ? this.rule.max
                        ? `the range bounded by ${boundToExpression(
                              "min",
                              this.rule.min
                          )} and ${boundToExpression("max", this.rule.max)}`
                        : boundToExpression("min", this.rule.min)
                    : this.rule.max
                    ? boundToExpression("max", this.rule.max)
                    : "the unbounded range"
            }
        }
)

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
