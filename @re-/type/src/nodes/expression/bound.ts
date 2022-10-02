import { keySet } from "@re-/tools"
import type { Base } from "../base.js"
import type { PrimitiveLiteral } from "../terminal/primitiveLiteral.js"
import type { Check } from "../traverse/check/check.js"
import { Constraint } from "../traverse/check/common.js"
import { Binary } from "./expression.js"

export namespace Bound {
    export const tokens = keySet({
        "<": 1,
        ">": 1,
        "<=": 1,
        ">=": 1,
        "==": 1
    })

    export type Token = keyof typeof tokens

    export const doubleTokens = keySet({
        "<=": 1,
        "<": 1
    })

    export type DoubleToken = keyof typeof doubleTokens

    export const invertedComparators = {
        "<": ">",
        ">": "<",
        "<=": ">=",
        ">=": "<=",
        "==": "=="
    } as const

    export type InvertedComparators = typeof invertedComparators

    export const comparatorDescriptions = {
        "<": "less than",
        ">": "greater than",
        "<=": "at most",
        ">=": "at least",
        "==": "exactly"
    } as const

    const isWithinBound = (
        normalizedComparator: Token,
        limit: number,
        actual: number
    ) => {
        switch (normalizedComparator) {
            case "<=":
                return actual <= limit
            case ">=":
                return actual >= limit
            case "<":
                return actual < limit
            case ">":
                return actual > limit
            case "==":
                return actual === limit
            default:
                // TODO: Does this work?
                // c8 ignore next
                throw new Error(
                    `Unexpected comparator '${normalizedComparator}'.`
                )
        }
    }

    const checkBound = (
        node: LeftNode | RightNode,
        comparator: Token,
        limit: number,
        state: Check.State<Constraint.Data>
    ) => {
        const actual = Constraint.toNumber(state.data)
        if (!isWithinBound(comparator, limit, actual)) {
            const kind = Constraint.toKind(state.data)
            state.addError("bound", {
                type: node,
                message: describe(comparator, limit, kind),
                comparator,
                comparatorDescription: comparatorDescriptions[comparator],
                limit,
                actual,
                kind
            })
            return false
        }
        return true
    }

    export class LeftNode extends Binary.Node<
        PrimitiveLiteral.Node<number>,
        DoubleToken,
        RightNode
    > {
        check(state: Check.State<Constraint.Data>) {
            checkBound(
                this,
                invertedComparators[this.token],
                this.left.value,
                state
            ) && this.right.check(state)
        }
    }

    export class RightNode extends Binary.Node<
        Base.Node,
        Token,
        PrimitiveLiteral.Node<number>
    > {
        check(state: Check.State<Constraint.Data>) {
            checkBound(this, this.token, this.right.value, state)
        }
    }

    export type Diagnostic = Check.ConfigureDiagnostic<
        LeftNode | RightNode,
        {
            comparator: Token
            comparatorDescription: string
            limit: number
            actual: number
            kind: BoundableKind
        }
    >

    const describe = (comparator: Token, limit: number, kind: BoundableKind) =>
        `Must be ${comparatorDescriptions[comparator]} ${limit}${
            kind === "string" ? " characters" : kind === "array" ? " items" : ""
        }`

    export type BoundableKind = "number" | "string" | "array"
    export type Units = "characters" | "items"
}
