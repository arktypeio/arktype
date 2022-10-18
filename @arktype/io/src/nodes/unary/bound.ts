import { keySet } from "@arktype/tools"
import { InternalArktypeError } from "../../internal.js"
import type { Base } from "../base.js"
import type { TraversalState } from "../traversal/traversal.js"
import { Unary } from "./unary.js"

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

    export class LeftNode extends Unary.Node {
        readonly kind = "leftBound"

        constructor(
            public limit: number,
            public comparator: DoublableToken,
            public child: RightNode
        ) {
            super()
        }

        allows(state: TraversalState) {
            const actual = boundableToNumber(state.data)
            return isWithin(
                invertedComparators[this.comparator],
                this.limit,
                actual
            )
        }

        toString() {
            return `${this.limit}${
                this.comparator
            }${this.child.toString()}` as const
        }

        tupleWrap(next: ReturnType<RightNode["tupleWrap"]>) {
            return [`${this.limit}`, this.comparator, next] as const
        }

        get mustBe() {
            // TODO: Add units description
            return `${
                comparatorDescriptions[invertedComparators[this.comparator]]
            } ${this.limit}` as const
        }
    }

    export class RightNode<
        HasLeft extends boolean = boolean
    > extends Unary.Node {
        readonly kind = "bound"

        constructor(
            public child: Base.Node,
            public comparator: HasLeft extends true ? DoublableToken : Token,
            public limit: number
        ) {
            super()
        }

        allows(state: TraversalState) {
            // TODO: Check if data is of the expected type
            const actual = boundableToNumber(state.data)
            return isWithin(this.comparator, this.limit, actual)
        }

        toString() {
            return `${this.child.toString()}${this.comparator}${
                this.limit
            }` as const
        }

        tupleWrap(next: unknown) {
            return [next, this.comparator, `${this.limit}`] as const
        }

        get mustBe() {
            // TODO: Add units description
            return `${comparatorDescriptions[this.comparator]} ${
                this.limit
            }` as const
        }
    }

    type BoundableData = number | string | readonly unknown[]

    const boundableToNumber = (data: BoundableData) =>
        typeof data === "number" ? data : data.length

    // type BoundableKind = "number" | "string" | "array"

    // const toBoundableKind = (data: unknown) =>
    //     typeof data === "number"
    //         ? "number"
    //         : typeof data === "string"
    //         ? "string"
    //         : Array.isArray(data)
    //         ? "array"
    //         : "unboundable"
}
