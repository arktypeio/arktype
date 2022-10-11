import { keySet } from "@re-/tools"
import { InternalArktypeError } from "../../../internal.js"
import type { Base } from "../../common.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { Check } from "../../traverse/check.js"
import { Constraining } from "./constraining.js"

export namespace Bound {
    export const tokens = keySet({
        "<": 1,
        ">": 1,
        "<=": 1,
        ">=": 1,
        "==": 1
    })

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

    export class LeftNode extends Constraining.LeftNode<
        PrimitiveLiteral.Number,
        DoublableToken,
        RightNode
    > {
        allows(state: Check.State) {
            const actual = boundableToNumber(state.data as BoundableData)
            return isWithinBound(
                invertedComparators[this.token],
                this.value,
                actual
            )
        }

        toDescription() {
            // TODO: Add description
            return `${
                comparatorDescriptions[invertedComparators[this.token]]
            } ${this.value}`
        }
    }

    // TODO: Remove these?
    export type RightAst<Child = unknown> = [
        Child,
        Token,
        PrimitiveLiteral.Number
    ]

    export class RightNode<
        HasLeft extends boolean = boolean
    > extends Constraining.RightNode<
        Base.Node,
        HasLeft extends true ? DoublableToken : Token,
        PrimitiveLiteral.Number
    > {
        allows(state: Check.State) {
            const actual = boundableToNumber(state.data as BoundableData)
            return isWithinBound(this.token, this.value, actual)
        }

        toDescription() {
            // TODO: Add description
            return `${comparatorDescriptions[this.token]} ${this.value}`
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
