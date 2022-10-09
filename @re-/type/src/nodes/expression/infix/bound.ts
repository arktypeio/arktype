import { keySet } from "@re-/tools"
import { Constrainable } from "../../common.js"
import type { Base } from "../../common.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { Check } from "../../traverse/check.js"
import { Infix } from "./infix.js"

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
        state: Check.State<Constrainable.Data>
    ) => {
        const actual = Constrainable.toNumber(state.data)
        if (!isWithinBound(comparator, limit, actual)) {
            const kind = Constrainable.toKind(state.data)
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

    export type LeftAst<Child extends RightAst = RightAst> = [
        PrimitiveLiteral.Number,
        DoubleToken,
        Child
    ]

    export class LeftNode extends Infix.Node<
        PrimitiveLiteral.Node<number>,
        DoubleToken,
        RightNode
    > {
        check(state: Check.State<Constrainable.Data>) {
            checkBound(
                this,
                invertedComparators[this.token],
                this.left.value,
                state
            ) && this.right.check(state)
        }
    }

    export type RightAst<Child = unknown> = [
        Child,
        Token,
        PrimitiveLiteral.Number
    ]

    export class RightNode extends Infix.Node<
        Base.Node,
        Token,
        PrimitiveLiteral.Node<number>
    > {
        check(state: Check.State<Constrainable.Data>) {
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

    export const describe = (
        comparator: Token,
        limit: number,
        kind: BoundableKind
    ) =>
        `Must be ${comparatorDescriptions[comparator]} ${limit}${
            kind === "string" ? " characters" : kind === "array" ? " items" : ""
        }`

    export type BoundableKind = "number" | "string" | "array"
    export type Units = "characters" | "items"
}
