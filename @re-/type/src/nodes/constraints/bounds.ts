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
import type { ConstraintConstructorArgs } from "./constraint.js"
import { Constraint } from "./constraint.js"

export namespace Bounds {
    export type Ast = Single | Double

    export type Bound = [Scanner.Comparator, number]

    export type Lower = [NormalizedLowerBoundComparator, number]

    export type Upper = [DoubleBoundComparator, number]

    export type Single = [Bound]

    export type Double = [Lower, Upper]

    export type Apply<Child, Bounds extends Ast> = Evaluate<[Child, Bounds]>
}

export type BoundableAst = NumberKeyword | StringKeyword | [unknown, "[]"]

export type BoundableNode = strNode & {
    bounds?: BoundsConstraint
}

export type BoundableData = number | string | unknown[]

export const isBoundable = (node: strNode): node is BoundableNode =>
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

        this.message = describeBound(
            this.comparator,
            this.limit,
            this.size,
            this.kind
        )
    }
}

export const applyBound = (node: BoundableNode, bounds: BoundsConstraint) => {
    node.bounds = bounds
    applyBoundsToAst(node, bounds.ast)
    applyBoundsToDefinition(node, bounds.ast)
}

const applyBoundsToAst = (node: BoundableNode, ast: Bounds.Ast) => {
    node.ast = isConstrained(node.ast)
        ? [node.ast[0], [...node.ast[1], ...ast]]
        : [node.ast, ast]
}

const applyBoundsToDefinition = (node: BoundableNode, ast: Bounds.Ast) => {
    const rightBoundToString =
        ast.length === 1 ? ast[0].join("") : ast[1].join("")
    node.definition += rightBoundToString
    if (ast.length === 2) {
        const leftBoundToString = `${ast[0][1]}${
            invertedComparators[ast[0][0]]
        }`
        node.definition = leftBoundToString + node.definition
    }
}

export class BoundsConstraint extends Constraint {
    constructor(public ast: Bounds.Ast, ...rest: ConstraintConstructorArgs) {
        super(...rest)
    }

    check(args: Allows.Args<BoundableData>) {
        const actual =
            typeof args.data === "number" ? args.data : args.data.length
        for (const [comparator, limit] of this.ast) {
            if (!isWithinBound(comparator, limit, actual)) {
                const kind: BoundKind =
                    typeof args.data === "string"
                        ? "string"
                        : typeof args.data === "number"
                        ? "number"
                        : "array"
                args.diagnostics.add("bound", `${comparator}${limit}`, args, {
                    comparator,
                    limit,
                    kind,
                    actual,
                    reason: describeBound(comparator, limit, kind)
                })
                return
            }
        }
    }
}

export type BoundDiagnosticContext = {
    comparator: Scanner.Comparator
    limit: number
    actual: number
    kind: BoundKind
}

export const describeBound = (
    comparator: Scanner.Comparator,
    limit: number,
    kind: BoundKind
) =>
    `Must be ${comparatorToString[comparator]} ${limit} ${
        kind === "string" ? "characters " : kind === "array" ? "items " : ""
    }`

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
