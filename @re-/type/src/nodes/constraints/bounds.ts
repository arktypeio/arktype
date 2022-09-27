// TODO: Fix parser imports
import type {
    Comparator,
    DoubleBoundComparator,
    NormalizedLowerBoundComparator
} from "../../parser/str/operator/unary/bound/common.js"
import {
    comparatorToString,
    invertedComparators
} from "../../parser/str/operator/unary/bound/common.js"
import type { Base } from "../base.js"
import type { NumberTypedKeyword } from "../terminals/keywords/number.js"
import type { StringTypedKeyword } from "../terminals/keywords/string.js"
import type { CheckState } from "../traverse/check/check.js"
import type { Check } from "../traverse/exports.js"
import type { Constraint, PossiblyConstrainedAst } from "./constraint.js"

export namespace BoundsAst {
    export type Constraints = [Single] | [Lower, Upper]

    export type Single = [Comparator, number]

    export type Lower = [NormalizedLowerBoundComparator, number]

    export type Upper = [DoubleBoundComparator, number]
}

/** A BoundableNode must be either:
 *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
 *    2. A string-typed keyword terminal (e.g. "alphanumeric" in "100<alphanumeric")
 *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
 */
export type BoundableAst = PossiblyConstrainedAst<
    NumberTypedKeyword | StringTypedKeyword | [unknown, "[]"]
>

export type BoundableNode = Base.node & {
    bounds: null | BoundConstraint
}

export type BoundableData = number | string | unknown[]

export const isBoundable = (node: Base.node): node is BoundableNode =>
    "bounds" in node

export type BoundUnits = "characters" | "items"

export type BoundKind = "string" | "number" | "array"

export const applyBound = (node: BoundableNode, bounds: BoundConstraint) => {
    node.bounds = bounds
    applyBoundsToAst(node, bounds.ast)
    applyBoundsToDefinition(node, bounds.ast)
}

const applyBoundsToAst = (node: BoundableNode, ast: BoundsAst.Constraints) => {
    node.ast = isConstrained(node.ast)
        ? [node.ast[0], ":", [...node.ast[2], ...ast]]
        : [node.ast, ":", ast]
}

const applyBoundsToDefinition = (
    node: BoundableNode,
    ast: BoundsAst.Constraints
) => {
    const rightBoundToString =
        ast.length === 1 ? ast[0].join("") : ast[1].join("")
    node.def += rightBoundToString
    if (ast.length === 2) {
        const leftBoundToString = `${ast[0][1]}${
            invertedComparators[ast[0][0]]
        }`
        node.def = leftBoundToString + node.def
    }
}

export class BoundConstraint implements Constraint {
    constructor(public ast: BoundsAst.Constraints) {}

    check(state: Check.CheckState<BoundableData>) {
        const actual =
            typeof state.data === "number" ? state.data : state.data.length
        for (const [comparator, limit] of this.ast) {
            if (!isWithinBound(comparator, limit, actual)) {
                this.addBoundError(state, comparator, limit, actual)
                return
            }
        }
    }

    private addBoundError(
        state: CheckState<BoundableData>,
        comparator: Comparator,
        limit: number,
        actual: number
    ) {
        const kind: BoundKind =
            typeof state.data === "string"
                ? "string"
                : typeof state.data === "number"
                ? "number"
                : "array"
        state.errors.add(
            "bound",
            {
                reason: boundToString(comparator, limit, kind),
                state: state
            },
            {
                comparator,
                comparatorDescription: comparatorToString[comparator],
                limit,
                kind,
                actual,
                data: state.data
            }
        )
        return
    }
}

export type BoundDiagnostic = Check.DiagnosticConfig<{
    comparator: Comparator
    comparatorDescription: string
    data: BoundableData
    limit: number
    actual: number
    kind: BoundKind
}>

export const boundToString = (
    comparator: Comparator,
    limit: number,
    kind: BoundKind
) =>
    `Must be ${comparatorToString[comparator]} ${limit}${
        kind === "string" ? " characters" : kind === "array" ? " items" : ""
    }`

const isConstrained = (ast: unknown): ast is [unknown, ":", unknown[]] =>
    Array.isArray(ast) && ast[1] === ":"

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
