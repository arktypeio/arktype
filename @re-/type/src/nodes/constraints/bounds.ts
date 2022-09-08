import { Evaluate } from "@re-/tools"
import { Keyword } from "../../operand/index.js"
import {
    Comparator,
    comparatorToString,
    constraint,
    DoubleBoundComparator,
    invertedComparators,
    Node,
    NormalizedLowerBoundComparator,
    strNode,
    StrNode
} from "./common.js"

export type BoundDefinition = [Comparator, number]

export type SingleBoundDefinition = [BoundDefinition]

export type DoubleBoundDefinition = [LowerBoundDefinition, UpperBoundDefinition]

export type LowerBoundDefinition = [NormalizedLowerBoundComparator, number]

export type UpperBoundDefinition = [DoubleBoundComparator, number]

export type BoundsDefinition = SingleBoundDefinition | DoubleBoundDefinition

export type Bound<
    Child = unknown,
    Bounds extends BoundsDefinition = BoundsDefinition
> = Evaluate<[Child, Bounds]>

export type boundChecker = (y: number) => boolean

/** A BoundableNode must be either:
 *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
 *    2. A string-typed keyword terminal (e.g. "alphanum" in "100<alphanum")
 *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
 */
export type BoundableNode =
    | Keyword.OfTypeNumber
    | Keyword.OfTypeString
    | [unknown, "[]"]

export type boundableData = number | string | unknown[]

export const isConstrained = (tree: StrNode): tree is [StrNode, StrNode[]] =>
    Array.isArray(tree) && Array.isArray(tree[1])

export class boundsConstraint extends constraint<
    BoundsDefinition,
    boundableData
> {
    constructor(definition: BoundsDefinition) {
        super(definition)
    }

    boundTree(root: StrNode) {
        return isConstrained(root)
            ? [root[0], [...root[1], ...this.definition]]
            : [root, this.definition]
    }

    boundString(s: string) {
        const rightBoundToString =
            this.definition.length === 1
                ? this.definition[0].join("")
                : this.definition[1].join("")
        let result = s + rightBoundToString
        if (this.definition.length === 2) {
            const leftBoundToString = `${this.definition[0][1]}${
                invertedComparators[this.definition[0][0]]
            }`
            result = leftBoundToString + result
        }
        return result
    }

    check(args: Node.Allows.Args<boundableData>) {
        const size =
            typeof args.data === "number" ? args.data : args.data.length
        for (const [comparator, limit] of this.definition) {
            if (!isWithinBound(comparator, limit, size)) {
                args.diagnostics.push(
                    new BoundViolationDiagnostic(args, comparator, limit, size)
                )
            }
            return
        }
    }
}

export const isWithinBound = (
    comparator: Comparator,
    limit: number,
    size: number
) => {
    switch (comparator) {
        case "<=":
            return size <= limit
        case ">=":
            return size >= limit
        case "<":
            return size < limit
        case ">":
            return size > limit
        case "==":
            return size === limit
        default:
            // TODO: Does this work?
            // c8 ignore next
            throw new Error(`Unexpected comparator ${comparator}.`)
    }
}

export type boundableNode = strNode & {
    bounds: boundsConstraint | undefined
}

export type BoundableValue = number | string | unknown[]

export const isBoundable = (node: strNode): node is boundableNode =>
    "bounds" in node

export type BoundUnits = "characters" | "items"

export type BoundKind = "string" | "number" | "array"

export class BoundViolationDiagnostic extends Node.Allows
    .Diagnostic<"BoundViolation"> {
    message: string
    kind: BoundKind

    constructor(
        args: Node.Allows.Args,
        public comparator: Comparator,
        public limit: number,
        public size: number
    ) {
        super("BoundViolation", args)
        this.kind =
            typeof args.data === "string"
                ? "string"
                : typeof args.data === "number"
                ? "number"
                : "array"
        this.message = boundViolationMessage(
            this.comparator,
            this.limit,
            this.size,
            this.kind
        )
    }
}

export const boundViolationMessage = (
    comparator: Comparator,
    limit: number,
    size: number,
    kind: BoundKind
) =>
    `Must be ${comparatorToString[comparator]} ${limit} ${
        kind === "string" ? "characters " : kind === "array" ? "items " : ""
    }(got ${size}).`
