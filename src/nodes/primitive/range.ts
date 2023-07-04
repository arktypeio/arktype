import {
    isKeyOf,
    throwInternalError,
    throwParseError
} from "../../../dev/utils/src/main.js"
import { compileCheck, InputParameterName } from "../../compile/compile.js"
import { Disjoint } from "../disjoint.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

export type Bound<
    comparator extends Comparator = Comparator,
    limit extends number | Date = number | Date
> = {
    limit: limit
    comparator: comparator
}

export type Range = [Bound] | [Bound<MinComparator>, Bound<MaxComparator>]

// const units =
// s.lastDomain === "string"
//     ? "characters"
//     : s.lastDomain === "object"
//     ? "items long"
//     : ""

export interface RangeNode extends BaseNode<{ kind: "range"; rule: Range }> {
    min: Bound<MinComparator> | undefined
    max: Bound<MaxComparator> | undefined
    numericMin: Bound<MinComparator, number> | undefined
    numericMax: Bound<MaxComparator, number> | undefined
    numericEqualityValue: number | undefined
    rangeKind: RangeKind
}

export const rangeNode = defineNodeKind<RangeNode>(
    {
        kind: "range",
        parse: (input) => input,
        compile: (rule, ctx) => {
            const l = rule[0].limit.valueOf()
            const r = rule[1]?.limit.valueOf()
            if (
                l === r &&
                rule[0].comparator === ">=" &&
                rule[1]?.comparator === "<="
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
                        } ${bound.limit.valueOf()}`,
                        ctx
                    )
                )
                .join("\n")
        },
        intersect: (l, r): RangeNode | Disjoint => {
            if (l.rangeKind !== r.rangeKind) {
                return throwParseError(
                    writeIncompatibleRangeMessage(l.rangeKind, r.rangeKind)
                )
            }
            if (isEqualityRangeNode(l)) {
                if (isEqualityRangeNode(r)) {
                    return l.numericEqualityValue === r.numericEqualityValue
                        ? l
                        : Disjoint.from("range", l, r)
                }
                return r.allows(l.numericEqualityValue)
                    ? l
                    : Disjoint.from("range", l, r)
            }
            if (isEqualityRangeNode(r)) {
                return l.allows(r.numericEqualityValue)
                    ? r
                    : Disjoint.from("range", l, r)
            }

            const stricterMin = compareStrictness(
                "min",
                l.numericMin,
                r.numericMin
            )
            const stricterMax = compareStrictness(
                "max",
                l.numericMax,
                r.numericMax
            )
            if (stricterMin === "l") {
                if (stricterMax === "r") {
                    return compareStrictness(
                        "min",
                        l.numericMin,
                        r.numericMax
                    ) === "l"
                        ? Disjoint.from("range", l, r)
                        : rangeNode([l.min!, r.max!])
                }
                return l
            }
            if (stricterMin === "r") {
                if (stricterMax === "l") {
                    return compareStrictness(
                        "min",
                        l.numericMax,
                        r.numericMin
                    ) === "r"
                        ? Disjoint.from("range", l, r)
                        : rangeNode([r.min!, l.max!])
                }
                return r
            }
            return stricterMax === "l" ? l : r
        }
    },
    (base) => {
        const description = describeRange(base.rule[0], base.rule[1])
        const min = isKeyOf(base.rule[0].comparator, minComparators)
            ? (base.rule[0] as Bound<MinComparator>)
            : undefined
        const max =
            base.rule[1] ??
            (isKeyOf(base.rule[0].comparator, maxComparators)
                ? (base.rule[0] as Bound<MaxComparator>)
                : undefined)
        return {
            description,
            min,
            max,
            numericMin: min
                ? { ...min, limit: min?.limit.valueOf() }
                : undefined,
            numericMax: max
                ? { ...max, limit: max?.limit.valueOf() }
                : undefined,
            rangeKind: getRangeKind(base.rule),
            numericEqualityValue:
                base.rule[0].comparator === "=="
                    ? base.rule[0].limit.valueOf()
                    : undefined
        }
    }
)

type LimitsByRangeKind = {
    date: Date
    numeric: number
}

export type RangeKind = keyof LimitsByRangeKind

const boundHasKind = <kind extends RangeKind>(
    bound: Bound,
    kind: kind
): bound is Bound<Comparator, LimitsByRangeKind[kind]> =>
    getBoundKind(bound) === kind

const getBoundKind = (bound: Bound): RangeKind =>
    typeof bound.limit === "number" ? "numeric" : "date"

const getRangeKind = (range: Range): RangeKind => {
    const initialBoundKind = getBoundKind(range[0])
    if (range[1] && initialBoundKind !== getBoundKind(range[1])) {
        return throwParseError(
            writeIncompatibleRangeMessage(
                initialBoundKind,
                getBoundKind(range[1])
            )
        )
    }
    return initialBoundKind
}

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

export const numericComparatorDescriptions = {
    "<": "less than ",
    ">": "more than ",
    "<=": "at most ",
    ">=": "at least ",
    "==": "exactly "
} as const satisfies Record<Comparator, string>

export const dateComparatorDescriptions = {
    "<": "before ",
    ">": "after ",
    "<=": "at or before ",
    ">=": "at or after ",
    "==": ""
} as const satisfies Record<Comparator, string>

const describeBound = (bound: Bound) =>
    boundHasKind(bound, "date")
        ? `${
              dateComparatorDescriptions[bound.comparator]
          }${bound.limit.toISOString()}`
        : `${numericComparatorDescriptions[bound.comparator]}${bound.limit}`

const describeRange = (l: Bound, r: Bound | undefined) => {
    const leftDescription = describeBound(l)
    const rightDescription = r ? describeBound(r) : r
    return rightDescription
        ? `the range bounded by ${leftDescription} and ${rightDescription}`
        : leftDescription
}

export const invertedComparators = {
    "<": ">",
    ">": "<",
    "<=": ">=",
    ">=": "<=",
    "==": "=="
} as const satisfies Record<Comparator, Comparator>

export type InvertedComparators = typeof invertedComparators

export const writeIncompatibleRangeMessage = (l: RangeKind, r: RangeKind) =>
    `Range kinds ${l} and ${r} are incompatible`

export type NumericallyBoundableData = string | number | readonly unknown[]
