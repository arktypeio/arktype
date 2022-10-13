import { keySet } from "@re-/tools"
import { InternalArktypeError } from "../../internal.js"
import type { Base } from "../base.js"
import type { PrimitiveLiteral } from "../terminal/primitiveLiteral.js"
import type { Check } from "../traverse/check.js"
import { Expression } from "./expression.js"

export namespace Bound {
    export const tokensToKinds = {
        "<": "bound",
        ">": "bound",
        "<=": "bound",
        ">=": "bound",
        "==": "bound"
    } as const

    export type Token = keyof typeof tokensToKinds

    export const doublableTokens = keySet({
        "<=": 1,
        "<": 1
    })

    export type DoublableToken = keyof typeof doublableTokens

    export const invertedComparators = {
        "<": ">",
        ">": "<",
        "<=": ">=",
        ">=": "<=",
        "==": "=="
    } as const

    export type InvertedComparators = typeof invertedComparators

    const comparatorDescriptions: Record<Token, string> = {
        "<": "less than",
        ">": "greater than",
        "<=": "at most",
        ">=": "at least",
        "==": "exactly"
    }

    const isWithin = (
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
                throw new InternalArktypeError(
                    `Unexpected comparator '${normalizedComparator}'.`
                )
        }
    }

    // const checkBound = (
    //     node: LeftNode | RightNode,
    //     comparator: Token,
    //     limit: number
    // ) => {
    //     const kind = toBoundableKind(state.data)
    //     if (kind === "unboundable") {
    //         return false
    //     }
    //     const actual = boundableToNumber(state.data as BoundableData)
    //     if (!isWithinBound(comparator, limit, actual)) {
    //         state.addError("bound", {
    //             type: node,
    //             message: describe(comparator, limit, kind),
    //             comparator,
    //             comparatorDescription: comparatorDescriptions[comparator],
    //             limit,
    //             actual,
    //             kind
    //         })
    //         return false
    //     }
    //     return true
    // }

    export type LeftAst<Child extends RightAst = RightAst> = [
        PrimitiveLiteral.Number,
        DoublableToken,
        Child
    ]

    export type LeftTuple = [
        PrimitiveLiteral.Number,
        DoublableToken,
        RightTuple<true>
    ]

    export class LeftNode extends Expression.Node<[RightNode], LeftTuple> {
        readonly kind = "bound"

        constructor(
            public limit: number,
            public comparator: DoublableToken,
            child: RightNode
        ) {
            super([child])
        }

        allows(state: Check.State) {
            // TODO: Fix
            const actual = boundableToNumber(state.data as any)
            return isWithin(
                invertedComparators[this.comparator],
                this.limit,
                actual
            )
        }

        toString() {
            return `${this.limit}${
                this.comparator
            }${this.children[0].toString()}` as const
        }

        toTuple(child: RightTuple<true>) {
            return [`${this.limit}`, this.comparator, child] as const
        }

        get mustBe() {
            // TODO: Add units description
            return `${
                comparatorDescriptions[invertedComparators[this.comparator]]
            } ${this.limit}` as const
        }
    }

    // TODO: Remove these?
    export type RightAst<Child = unknown> = [
        Child,
        Token,
        PrimitiveLiteral.Number
    ]

    export type RightTuple<HasLeft extends boolean = boolean> = [
        unknown,
        HasLeft extends true ? DoublableToken : Token,
        PrimitiveLiteral.Number
    ]

    export class RightNode<
        HasLeft extends boolean = boolean
    > extends Expression.Node<[Base.Node], RightTuple<HasLeft>> {
        readonly kind = "bound"

        constructor(
            child: Base.Node,
            public comparator: DoublableToken,
            public limit: number
        ) {
            super([child])
        }

        allows(state: Check.State) {
            // TODO: Fix
            const actual = boundableToNumber(state.data as any)
            return isWithin(this.comparator, this.limit, actual)
        }

        toString() {
            return `${this.children[0].toString()}${this.comparator}${
                this.limit
            }` as const
        }

        toTuple(child: unknown) {
            return [child, this.comparator, `${this.limit}`] as const
        }

        get mustBe() {
            // TODO: Add units description
            return `${comparatorDescriptions[this.comparator]} ${
                this.limit
            }` as const
        }
    }

    export const describe = (
        comparator: Token,
        limit: number,
        kind: BoundableKind
    ) =>
        `Must be ${comparatorDescriptions[comparator]} ${limit}${
            kind === "string" ? " characters" : kind === "array" ? " items" : ""
        }`

    type BoundableData = number | string | readonly unknown[]

    const boundableToNumber = (data: BoundableData) =>
        typeof data === "number" ? data : data.length

    type BoundableKind = "number" | "string" | "array"

    const toBoundableKind = (data: unknown) =>
        typeof data === "number"
            ? "number"
            : typeof data === "string"
            ? "string"
            : Array.isArray(data)
            ? "array"
            : "unboundable"
}
