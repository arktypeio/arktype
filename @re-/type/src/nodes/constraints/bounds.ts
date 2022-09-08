import { Evaluate } from "@re-/tools"
import { Keyword } from "../../operand/index.js"
import { Allows } from "../traversal/allows.js"
import {
    Comparator,
    comparatorToString,
    DoubleBoundComparator,
    invertedComparators,
    NormalizedLowerBoundComparator,
    strNode,
    StrNode
} from "./common.js"

export type Bounds = Bounds.Single | Bounds.Double

export type Single = [[Comparator, number]]

export type Double = [Lower, Upper]

export type Lower = [NormalizedLowerBoundComparator, number]

export type Upper = [DoubleBoundComparator, number]

export type Apply<Child = unknown, Def extends Bounds = Bounds> = Evaluate<
    [Child, Def]
>

export type boundChecker = (y: number) => boolean

/** A BoundableNode must be either:
 *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
 *    2. A string-typed keyword terminal (e.g. "alphanumeric" in "100<alphanumeric")
 *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
 */
export type BoundableNode =
    | Keyword.OfTypeNumber
    | Keyword.OfTypeString
    | [unknown, "[]"]

export type boundableData = number | string | unknown[]

export const isBoundable = (node: strNode): node is boundableNode =>
    "bounds" in node

export type BoundUnits = "characters" | "items"

export type BoundKind = "string" | "number" | "array"

export class BoundViolationDiagnostic extends Allows.Diagnostic<"BoundViolation"> {
    message: string
    kind: BoundKind

    constructor(
        args: Allows.Args,
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

export class bounds {
    constructor(public definition: Bounds) {}

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

    check(args: Allows.Args<boundableData>) {
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

export const boundViolationMessage = (
    comparator: Comparator,
    limit: number,
    size: number,
    kind: BoundKind
) =>
    `Must be ${comparatorToString[comparator]} ${limit} ${
        kind === "string" ? "characters " : kind === "array" ? "items " : ""
    }(got ${size}).`

const isConstrained = (tree: StrNode): tree is [StrNode, StrNode[]] =>
    Array.isArray(tree) && Array.isArray(tree[1])

const isWithinBound = (comparator: Comparator, limit: number, size: number) => {
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
    bounds: bounds | undefined
}
