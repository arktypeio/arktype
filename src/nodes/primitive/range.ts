import { isKeyOf, throwInternalError } from "../../../dev/utils/src/main.js"
import { Disjoint } from "../disjoint.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

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

export interface RangeNode extends BaseNode<Range> {
    min: Bound<MinComparator> | undefined
    max: Bound<MaxComparator> | undefined
}

export const rangeNode = defineNodeKind<RangeNode>(
    {
        kind: "range",
        parse: (input) => input,
        compile: (rule, s) => {
            if (
                rule[0].limit === rule[1]?.limit &&
                rule[0].comparator === ">=" &&
                rule[1].comparator === "<="
            ) {
                // reduce a range like `1<=number<=1` to `number==1`
                rule = [{ comparator: "==", limit: rule[0].limit }]
            }
            const size = s.lastBasis
                ? s.lastBasis.domain === "number"
                    ? s.data
                    : s.lastBasis.domain === "string"
                    ? `${s.data}.length`
                    : s.lastBasis.hasKind("class")
                    ? s.lastBasis.extendsOneOf(Date)
                        ? `Number(${s.data})`
                        : s.lastBasis.extendsOneOf(Array)
                        ? `${s.data}.length`
                        : throwInternalError(
                              `Unexpected basis for range constraint ${s.lastBasis}`
                          )
                    : throwInternalError(
                          `Unexpected basis for range constraint ${s.lastBasis}`
                      )
                : `${s.data}.length ?? Number(${s.data})`
            // sorted as lower, upper by definition
            return rule
                .map((bound) =>
                    s.check(
                        "range",
                        bound,
                        `${size} ${
                            bound.comparator === "==" ? "===" : bound.comparator
                        } ${bound.limit}`
                    )
                )
                .join("\n")
        },
        intersect: (l, r): RangeNode | Disjoint => {
            if (isEqualityRangeNode(l)) {
                if (isEqualityRangeNode(r)) {
                    return l === r ? l : Disjoint.from("range", l, r)
                }
                return r.allows(l.rule[0].limit)
                    ? l
                    : Disjoint.from("range", l, r)
            }
            if (isEqualityRangeNode(r)) {
                return l.allows(r.rule[0].limit)
                    ? r
                    : Disjoint.from("range", l, r)
            }
            const stricterMin = compareStrictness("min", l.min, r.min)
            const stricterMax = compareStrictness("max", l.max, r.max)
            if (stricterMin === "l") {
                if (stricterMax === "r") {
                    return compareStrictness("min", l.min, r.max) === "l"
                        ? Disjoint.from("range", l, r)
                        : rangeNode([l.min!, r.max!])
                }
                return l
            }
            if (stricterMin === "r") {
                if (stricterMax === "l") {
                    return compareStrictness("min", l.max, r.min) === "r"
                        ? Disjoint.from("range", l, r)
                        : rangeNode([r.min!, l.max!])
                }
                return r
            }
            return stricterMax === "l" ? l : r
        }
    },
    (base) => {
        const leftDescription = `${base.rule[0].comparator}${base.rule[0].limit}`
        const description = base.rule[1]
            ? `the range bounded by ${leftDescription} and ${base.rule[1].comparator}${base.rule[1].limit}`
            : leftDescription
        return {
            description,
            min: isKeyOf(base.rule[0].comparator, minComparators)
                ? (base.rule[0] as Bound<MinComparator>)
                : undefined,
            max:
                base.rule[1] ??
                (isKeyOf(base.rule[0].comparator, maxComparators)
                    ? (base.rule[0] as Bound<MaxComparator>)
                    : undefined)
        }
    }
)

const isEqualityRangeNode = (
    node: RangeNode
): node is RangeNode & { rule: [Bound<"==">] } =>
    node.rule[0].comparator === "=="

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
