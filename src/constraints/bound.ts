import type { evaluate } from "@arktype/utils"
import { In } from "../compiler/compile.js"
import { NodeBase } from "../nodes/base.js"
import type { Disjoint } from "../nodes/disjoint.js"
import type { DateLiteral } from "../parser/string/shift/operand/date.js"

export type LimitLiteral = number | DateLiteral

export type BoundGroupInput =
    | Bound
    | readonly [Bound]
    | readonly [MinBound, MaxBound]

export type BoundGroup = SingleBoundGroup | DoubleBoundGroup

export type SingleBoundGroup = readonly [BoundNode]

export type DoubleBoundGroup = readonly [
    BoundNode<MinBound>,
    BoundNode<MaxBound>
]

export type MinBound = evaluate<Bound & { comparator: MinComparator }>

export type MaxBound = evaluate<Bound & { comparator: MaxComparator }>

export type Bound = {
    limit: LimitLiteral
    comparator: Comparator
}

export class BoundNode<bound extends Bound = Bound> extends NodeBase<{
    rule: bound
    intersection: BoundGroup
    meta: {}
}> {
    readonly kind = "bound"
    readonly comparator = this.rule.comparator
    readonly limit = this.rule.limit
    readonly boundKind = getBoundKind(this.rule)

    compile() {
        // TODO: basis-specific
        const size = `${In}.length ?? Number(${In})`
        return `${size} ${
            this.comparator === "==" ? "===" : this.comparator
        } ${this.limit.valueOf()}`
    }

    intersect(other: BoundGroup): BoundGroup | Disjoint {
        return other
    }

    describe() {
        return `${
            boundHasKind(this.rule, "date")
                ? dateComparatorDescriptions[this.comparator]
                : numericComparatorDescriptions[this.comparator]
        } ${this.limit}`
    }
}

type LimitsByBoundKind = {
    date: DateLiteral
    numeric: number
}

export type BoundKind = keyof LimitsByBoundKind

type boundOfKind<kind extends BoundKind> = evaluate<
    Bound & { limit: LimitsByBoundKind[kind] }
>

const boundHasKind = <kind extends BoundKind>(
    bound: Bound,
    kind: kind
): bound is boundOfKind<kind> => getBoundKind(bound) === kind

const getBoundKind = (bound: Bound): BoundKind =>
    typeof bound.limit === "number" ? "numeric" : "date"

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
    "<": "less than",
    ">": "more than",
    "<=": "at most",
    ">=": "at least",
    "==": "exactly"
} as const satisfies Record<Comparator, string>

export const dateComparatorDescriptions = {
    "<": "before",
    ">": "after",
    "<=": "at or before",
    ">=": "at or after",
    "==": ""
} as const satisfies Record<Comparator, string>

export const invertedComparators = {
    "<": ">",
    ">": "<",
    "<=": ">=",
    ">=": "<=",
    "==": "=="
} as const satisfies Record<Comparator, Comparator>

export type InvertedComparators = typeof invertedComparators

export const writeIncompatibleRangeMessage = (l: BoundKind, r: BoundKind) =>
    `Bound kinds ${l} and ${r} are incompatible`

export type NumericallyBoundableData = string | number | readonly unknown[]

// const getRangeKind = (range: Range): BoundKind => {
//     const initialBoundKind = getBoundKind(range[0])
//     if (range[1] && initialBoundKind !== getBoundKind(range[1])) {
//         return throwParseError(
//             writeIncompatibleRangeMessage(
//                 initialBoundKind,
//                 getBoundKind(range[1])
//             )
//         )
//     }
//     return initialBoundKind
// }

// const isEqualityRangeNode = (
//     node: BoundNode
// ): node is BoundNode & { children: [Bound<"==">] } =>
//     node.children[0].comparator === "=="

// s.lastDomain === "string"
// const units =
//     ? "characters"
//     : s.lastDomain === "object"
//     ? "items long"
//     : ""

// const l = rule[0].limit.valueOf()
// const r = rule[1]?.limit.valueOf()
// if (
//     l === r &&
//     rule[0].comparator === ">=" &&
//     rule[1]?.comparator === "<="
// ) {
//     // reduce a range like `1<=number<=1` to `number==1`
//     rule = [{ comparator: "==", limit: rule[0].limit }]
// }

// export const intersectRanges: PrimitiveIntersection<BoundConfig> = (l) => {
// if (l.rangeKind !== r.rangeKind) {
//     return throwParseError(
//         writeIncompatibleRangeMessage(l.rangeKind, r.rangeKind)
//     )
// }
// if (isEqualityRangeNode(l)) {
//     if (isEqualityRangeNode(r)) {
//         return l.numericEqualityValue === r.numericEqualityValue
//             ? l
//             : Disjoint.from("range", l, r)
//     }
//     return r.allows(l.numericEqualityValue)
//         ? l
//         : Disjoint.from("range", l, r)
// }
// if (isEqualityRangeNode(r)) {
//     return l.allows(r.numericEqualityValue)
//         ? r
//         : Disjoint.from("range", l, r)
// }

// const stricterMin = compareStrictness("min", l.numericMin, r.numericMin)
// const stricterMax = compareStrictness("max", l.numericMax, r.numericMax)
// if (stricterMin === "l") {
//     if (stricterMax === "r") {
//         return compareStrictness("min", l.numericMin, r.numericMax) === "l"
//             ? Disjoint.from("range", l, r)
//             : rangeNode([l.min!, r.max!])
//     }
//     return l
// }
// if (stricterMin === "r") {
//     if (stricterMax === "l") {
//         return compareStrictness("min", l.numericMax, r.numericMin) === "r"
//             ? Disjoint.from("range", l, r)
//             : rangeNode([r.min!, l.max!])
//     }
//     return r
// }
// return stricterMax === "l" ? l : r
// }
