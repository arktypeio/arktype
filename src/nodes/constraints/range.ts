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

export const RangeNode = defineNode<Range>({
    kind: "range",
    condition: (rule) => `${rule}`,
    describe: (rule) => {
        return rule.min
            ? rule.max
                ? `the range bounded by ${boundToExpression(
                      "min",
                      rule.min
                  )} and ${boundToExpression("max", rule.max)}`
                : boundToExpression("min", rule.min)
            : rule.max
            ? boundToExpression("max", rule.max)
            : "the unbounded range"
    },
    intersect: (l, r): Range | Disjoint => {
        const stricterMin = compareStrictness("min", l.min, r.min)
        const stricterMax = compareStrictness("max", l.max, r.max)
        if (stricterMin === "l") {
            if (stricterMax === "r") {
                return compareStrictness("min", l.min, r.max) === "l"
                    ? Disjoint.from("range", l, r)
                    : {
                          min: l.min!,
                          max: r.max!
                      }
            }
            return l
        }
        if (stricterMin === "r") {
            if (stricterMax === "l") {
                return compareStrictness("max", l.max, r.min) === "l"
                    ? Disjoint.from("range", l, r)
                    : {
                          min: r.min!,
                          max: l.max!
                      }
            }
            return r
        }
        return stricterMax === "l" ? l : r
    }
})

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
