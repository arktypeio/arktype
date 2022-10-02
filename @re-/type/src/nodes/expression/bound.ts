// TODO: Fix parser imports
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

    const checkBounds = (node: Single, state: Check.State<Constraint.Data>) => {
        const actual = Constraint.toNumber(state.data)
        for (const [comparator, limit] of bounds) {
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
                return
            }
        }
    }

    export namespace Single {
        export type Bound = [Token, number]

        export class Node implements Base.Node {
            public children: [Base.Node]
            public bounds: [Bound]

            constructor(private child: Base.Node, private bound: Bound) {
                this.children = [child]
                this.bounds = [bound]
            }

            check(state: Check.State<Constraint.Data>) {
                checkBounds(this, state)
            }

            affixAst(child: unknown) {
                return [child, this.bound[0], this.bound[1]] as const
            }

            affixString(child: string) {
                return `${child}${this.bound[0]}${this.bound[1]}` as const
            }
        }
    }

    export namespace Double {
        export const tokens = keySet({
            "<=": 1,
            "<": 1
        })

        export type Token = keyof typeof tokens

        type NormalizedLeftToken = ">" | ">="

        export type Bounds = [[NormalizedLeftToken, number], [Token, number]]

        export type Lower = [number, Token]

        export type Upper = [Token, number]

        export class Node implements Base.Node {
            public children: [Base.Node]
            public bounds: Bounds

            constructor(
                private child: Base.Node,
                private lower: Lower,
                private upper: Upper
            ) {
                this.children = [child]
                this.bounds = [[invertedComparators[lower[1]], lower[0]], upper]
            }

            check(state: Check.State<Constraint.Data>) {
                checkBounds(this, state)
            }

            affixAst(child: unknown) {
                return [
                    this.lower[0],
                    this.lower[1],
                    child,
                    this.upper[0],
                    this.upper[1]
                ] as const
            }

            affixString(child: string) {
                return `${this.lower[0]}${this.lower[1]}${child}${this.upper[0]}${this.upper[1]}` as const
            }
        }
    }

    export type Diagnostic = Check.ConfigureDiagnostic<
        Node,
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
