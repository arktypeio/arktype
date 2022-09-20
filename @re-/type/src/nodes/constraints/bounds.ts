import type { Evaluate } from "@re-/tools"
// TODO: Fix parser imports
import type {
    DoubleBoundComparator,
    NormalizedLowerBoundComparator
} from "../../parser/str/operator/bound/common.js"
import {
    comparatorToString,
    invertedComparators
} from "../../parser/str/operator/bound/common.js"
import type { Scanner } from "../../parser/str/state/scanner.js"
import { Allows } from "../allows.js"
import type { StrNode, strNode } from "../common.js"
import type { NumberKeyword } from "../terminals/keywords/number.js"
import type { StringKeyword } from "../terminals/keywords/string.js"

export type Bounds = Bounds.Single | Bounds.Double

export namespace Bounds {
    export type Any = [Scanner.Comparator, number]

    export type Lower = [NormalizedLowerBoundComparator, number]

    export type Upper = [DoubleBoundComparator, number]

    export type Single = [Any]

    export type Double = [Lower, Upper]

    export type Apply<Child = unknown, Def extends Bounds = Bounds> = Evaluate<
        [Child, Def]
    >
}

export type boundChecker = (y: number) => boolean

/** A BoundableNode must be either:
 *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
 *    2. A string-typed keyword terminal (e.g. "alphanumeric" in "100<alphanumeric")
 *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
 */
export type BoundableNode = NumberKeyword | StringKeyword | [unknown, "[]"]

export type boundableNode = strNode & {
    bounds?: bounds
}

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
        public comparator: Scanner.Comparator,
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

export const applyBound = (node: boundableNode, bounds: bounds) => {
    node.bounds = bounds
    applyBoundsToAst(node, bounds.definition)
    applyBoundsToDefinition(node, bounds.definition)
}

const applyBoundsToAst = (node: boundableNode, definition: Bounds) => {
    node.ast = isConstrained(node.ast)
        ? [node.ast[0], [...node.ast[1], ...definition]]
        : [node.ast, definition]
}

const applyBoundsToDefinition = (node: boundableNode, definition: Bounds) => {
    const rightBoundToString =
        definition.length === 1
            ? definition[0].join("")
            : definition[1].join("")
    node.definition += rightBoundToString
    if (definition.length === 2) {
        const leftBoundToString = `${definition[0][1]}${
            invertedComparators[definition[0][0]]
        }`
        node.definition = leftBoundToString + node.definition
    }
}

export class bounds {
    constructor(public definition: Bounds) {}

    check(args: Allows.Args<boundableData>) {
        const size =
            typeof args.data === "number" ? args.data : args.data.length
        for (const [comparator, limit] of this.definition) {
            if (!isWithinBound(comparator, limit, size)) {
                args.diagnostics.push(
                    new BoundViolationDiagnostic(args, comparator, limit, size)
                )
                return
            }
        }
    }
}

export const boundViolationMessage = (
    comparator: Scanner.Comparator,
    limit: number,
    size: number,
    kind: BoundKind
) =>
    `Must be ${comparatorToString[comparator]} ${limit} ${
        kind === "string" ? "characters " : kind === "array" ? "items " : ""
    }(got ${size}).`

const isConstrained = (ast: StrNode): ast is [StrNode, StrNode[]] =>
    Array.isArray(ast) && Array.isArray(ast[1])

const isWithinBound = (
    comparator: Scanner.Comparator,
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
