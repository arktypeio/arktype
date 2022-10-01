// TODO: Fix parser imports
import { keySet } from "@re-/tools"
import type { Base } from "../../base.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { Check } from "../../traverse/check/check.js"
import { Binary } from "./binary.js"

export namespace Bound {
    export const tokens = keySet({
        "<": 1,
        ">": 1,
        "<=": 1,
        ">=": 1,
        "==": 1
    })

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

    export type Children<IsLeft extends boolean> = IsLeft extends true
        ? [PrimitiveLiteral.Node<number>, Base.Node]
        : [Base.Node, PrimitiveLiteral.Node<number>]

    export class Node<IsLeft extends boolean> extends Binary.Node<
        Token,
        Children<IsLeft>
    > {
        constructor(
            children: Children<IsLeft>,
            public token: Token,
            private isLeft: IsLeft
        ) {
            super(children)
        }

        get bounded() {
            return this.children[this.isLeft ? 1 : 0] as Base.Node
        }

        get limit() {
            return (
                this.children[
                    this.isLeft ? 0 : 1
                ] as PrimitiveLiteral.Node<number>
            ).value
        }

        // If this is a left bound, normalizedComparator will be the inversion
        // of this.token so it can be checked consistently
        get normalizedComparator() {
            return this.isLeft ? invertedComparators[this.token] : this.token
        }

        check(state: Check.State<BoundableData>) {
            const actual =
                typeof state.data === "number" ? state.data : state.data.length
            if (!this.isWithinBound(actual)) {
                this.addError(state, actual)
            }
        }

        private isWithinBound(actual: number) {
            switch (this.normalizedComparator) {
                case "<=":
                    return actual <= this.limit
                case ">=":
                    return actual >= this.limit
                case "<":
                    return actual < this.limit
                case ">":
                    return actual > this.limit
                case "==":
                    return actual === this.limit
                default:
                    // TODO: Does this work?
                    // c8 ignore next
                    throw new Error(
                        `Unexpected comparator '${this.normalizedComparator}'.`
                    )
            }
        }

        private addError(state: Check.State<BoundableData>, actual: number) {
            const kind: BoundableKind =
                typeof state.data === "string"
                    ? "string"
                    : typeof state.data === "number"
                    ? "number"
                    : "array"
            state.errors.add(
                "bound",
                {
                    reason: describe(this.token, this.limit, kind),
                    state
                },
                {
                    comparator: this.token,
                    comparatorDescription: comparatorDescriptions[this.token],
                    limit: this.limit,
                    kind,
                    actual,
                    data: state.data
                }
            )
        }
    }

    export type Diagnostic = Check.DefineDiagnostic<{
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
