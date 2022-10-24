import { keySet } from "@arktype/tools"
import { InternalArktypeError } from "../../../utils.js"
import type { Base } from "../../base/base.js"
import { Infix } from "./infix.js"

export namespace Bound {
    export const tokens = Infix.comparators

    export type Token = keyof typeof tokens

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

    export class LeftNode extends Infix.Node {
        readonly kind = "leftBound"

        constructor(
            public limit: number,
            public comparator: DoublableToken,
            public child: RightNode<true>
        ) {
            super()
        }

        traverse(traversal: Base.Traversal) {
            const actual = boundableToNumber(traversal.data as any)
            if (
                !isWithin(
                    invertedComparators[this.comparator],
                    this.limit,
                    actual
                )
            ) {
                traversal.addProblem(this)
            }
        }

        toString() {
            return `${this.limit}${
                this.comparator
            }${this.child.toString()}` as const
        }

        tupleWrap(next: ReturnType<RightNode["tupleWrap"]>) {
            return [`${this.limit}`, this.comparator, next] as const
        }

        get description() {
            return `${this.child.description} ${this.mustBe}` as const
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
    > extends Infix.Node {
        readonly kind = "rightBound"

        constructor(
            public child: Base.Node,
            public comparator: HasLeft extends true ? DoublableToken : Token,
            public limit: number
        ) {
            super()
        }

        traverse(traversal: Base.Traversal) {
            // TODO: Check if data is of the expected type
            const actual = boundableToNumber(traversal.data as any)
            if (!isWithin(this.comparator, this.limit, actual)) {
                traversal.addProblem(this)
            }
        }

        toString() {
            return `${this.child.toString()}${this.comparator}${
                this.limit
            }` as const
        }

        tupleWrap(next: unknown) {
            return [next, this.comparator, `${this.limit}`] as const
        }

        get description() {
            return `${this.child.description} ${this.mustBe}` as const
        }

        get mustBe() {
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
