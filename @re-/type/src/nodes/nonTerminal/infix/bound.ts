// TODO: Fix parser imports
import { keySet } from "@re-/tools"
import type { Base } from "../../base.js"
import type { LiteralNode } from "../../terminal/literal.js"
import type { CheckState } from "../../traverse/check/check.js"
import type { Check } from "../../traverse/exports.js"
import type { TraversalState } from "../../traverse/traverse.js"
import { Infix } from "./infix.js"

export namespace Bound {
    export const tokens = keySet({
        "<": 1,
        ">": 1,
        "<=": 1,
        ">=": 1,
        "==": 1
    })

    /** We have to invert the first comparator in an expression like
     * 5<=number<10
     * so that it can be split into two expressions like
     * number>=5
     * number<10
     */
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

    export type Token = keyof typeof tokens

    export class Node<IsLeft extends boolean> extends Infix.Node<Token> {
        private limitValue: number
        // If this is a left bound, normalizedComparator will be the inversion
        // of this.token so it can be checked consistently
        private normalizedComparator: Token

        constructor(
            private bounded: Base.node,
            limit: LiteralNode<number>,
            public token: Token,
            isLeft: IsLeft
        ) {
            super([bounded, limit])
            this.limitValue = limit.value
            this.normalizedComparator = isLeft
                ? invertedComparators[token]
                : token
        }

        check(state: Check.CheckState<BoundableData>) {
            const actual =
                typeof state.data === "number" ? state.data : state.data.length
            if (!this.isWithinBound(actual)) {
                this.addError(state, actual)
            }
        }

        generate(state: TraversalState) {
            this.bounded.generate(state)
        }

        private isWithinBound(actual: number) {
            switch (this.normalizedComparator) {
                case "<=":
                    return actual <= this.limitValue
                case ">=":
                    return actual >= this.limitValue
                case "<":
                    return actual < this.limitValue
                case ">":
                    return actual > this.limitValue
                case "==":
                    return actual === this.limitValue
                default:
                    // TODO: Does this work?
                    // c8 ignore next
                    throw new Error(
                        `Unexpected comparator '${this.normalizedComparator}'.`
                    )
            }
        }

        private addError(state: CheckState<BoundableData>, actual: number) {
            const kind: BoundableKind =
                typeof state.data === "string"
                    ? "string"
                    : typeof state.data === "number"
                    ? "number"
                    : "array"
            state.errors.add(
                "bound",
                {
                    reason: describe(this.token, this.limitValue, kind),
                    state
                },
                {
                    comparator: this.token,
                    comparatorDescription: comparatorDescriptions[this.token],
                    limit: this.limitValue,
                    kind,
                    actual,
                    data: state.data
                }
            )
        }
    }

    export type Diagnostic = Check.DiagnosticConfig<{
        comparator: Token
        comparatorDescription: string
        data: BoundableData
        limit: number
        actual: number
        kind: BoundableKind
    }>

    const describe = (comparator: Token, limit: number, kind: BoundableKind) =>
        `Must be ${comparatorDescriptions[comparator]} ${limit}${
            kind === "string" ? " characters" : kind === "array" ? " items" : ""
        }`

    export type BoundableData = number | string | unknown[]
    export type BoundableKind = "number" | "string" | "array"
    export type Units = "characters" | "items"
}
