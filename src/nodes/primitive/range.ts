import { isKeyOf, throwInternalError } from "../../../dev/utils/src/main.js"
import { compileCheck, InputParameterName } from "../../compile/compile.js"
import { Disjoint } from "../disjoint.js"
import { defineNode } from "../node.js"
import type { PrimitiveNode, PrimitiveNodeConfig } from "./primitive.js"

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

export type RangeConstraint<comparator extends Comparator = Comparator> =
    PrimitiveNodeConfig<"range", Bound<comparator>, {}>

export type Bound<comparator extends Comparator = Comparator> = {
    readonly limit: number
    readonly comparator: comparator
}

export type Range =
    | readonly [RangeConstraint]
    | readonly [RangeConstraint<MinComparator>, RangeConstraint<MaxComparator>]

// s.lastDomain === "string"
// const units =
//     ? "characters"
//     : s.lastDomain === "object"
//     ? "items long"
//     : ""

export interface RangeNode extends PrimitiveNode<Range> {
    min: Bound<MinComparator> | undefined
    max: Bound<MaxComparator> | undefined
}

export const rangeNode = defineNode<RangeNode>(
    {
        kind: "range",
        compile: (rule, ctx) => {
            if (
                rule[0].limit === rule[1]?.limit &&
                rule[0].comparator === ">=" &&
                rule[1].comparator === "<="
            ) {
                // reduce a range like `1<=number<=1` to `number==1`
                rule = [{ comparator: "==", limit: rule[0].limit }]
            }
            const lastBasis = ctx.bases.at(-1)
            const size = lastBasis
                ? lastBasis.domain === "number"
                    ? InputParameterName
                    : lastBasis.domain === "string"
                    ? `${InputParameterName}.length`
                    : lastBasis.hasKind("class")
                    ? lastBasis.extendsOneOf(Date)
                        ? `Number(${InputParameterName})`
                        : lastBasis.extendsOneOf(Array)
                        ? `${InputParameterName}.length`
                        : throwInternalError(
                              `Unexpected basis for range constraint ${lastBasis}`
                          )
                    : throwInternalError(
                          `Unexpected basis for range constraint ${lastBasis}`
                      )
                : `${InputParameterName}.length ?? Number(${InputParameterName})`
            // sorted as lower, upper by definition
            return rule
                .map((bound) =>
                    compileCheck(
                        "range",
                        bound,
                        `${size} ${
                            bound.comparator === "==" ? "===" : bound.comparator
                        } ${bound.limit}`,
                        ctx
                    )
                )
                .join("\n")
        },
        intersect: (l, r): RangeNode | Disjoint => {
            if (isEqualityRangeNode(l)) {
                if (isEqualityRangeNode(r)) {
                    return l === r ? l : Disjoint.from("range", l, r)
                }
                return r.allows(l.children[0].limit)
                    ? l
                    : Disjoint.from("range", l, r)
            }
            if (isEqualityRangeNode(r)) {
                return l.allows(r.children[0].limit)
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
        const leftDescription = `${base.children[0].comparator}${base.children[0].limit}`
        const description = base.children[1]
            ? `the range bounded by ${leftDescription} and ${base.children[1].comparator}${base.children[1].limit}`
            : leftDescription
        return {
            description,
            min: isKeyOf(base.children[0].comparator, minComparators)
                ? (base.children[0] as Bound<MinComparator>)
                : undefined,
            max:
                base.children[1] ??
                (isKeyOf(base.children[0].comparator, maxComparators)
                    ? (base.children[0] as Bound<MaxComparator>)
                    : undefined)
        }
    }
)

const isEqualityRangeNode = (
    node: RangeNode
): node is RangeNode & { children: [Bound<"==">] } =>
    node.children[0].comparator === "=="

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
