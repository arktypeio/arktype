// TODO: Fix parser imports
import {
    comparatorToString,
    invertedComparators
} from "../../../parser/str/operator/unary/comparator/common.js"
import type {
    Comparator,
    DoubleBoundComparator,
    NormalizedLowerBoundComparator
} from "../../../parser/str/operator/unary/comparator/common.js"
import type { Base } from "../../base.js"
import type { CheckState } from "../../traverse/check/check.js"
import type { Check } from "../../traverse/exports.js"
import type { Narrowing } from "./narrowing.js"

export namespace Bounds {
    export type Ast = [Ast.Single] | [Ast.Lower, Ast.Upper]

    export namespace Ast {
        export type Single = [Comparator, number]

        export type Lower = [NormalizedLowerBoundComparator, number]

        export type Upper = [DoubleBoundComparator, number]
    }

    export class Condition implements Narrowing.Condition {
        constructor(public ast: Ast) {}

        check(state: Check.CheckState<BoundableData>) {
            const actual =
                typeof state.data === "number" ? state.data : state.data.length
            for (const [comparator, limit] of this.ast) {
                if (!isWithinBound(comparator, limit, actual)) {
                    this.addError(state, comparator, limit, actual)
                    return
                }
            }
        }

        affixToAst(conditionsAst: Base.UnknownAst[]) {
            conditionsAst.push(...this.ast)
        }

        affixToString(def: string) {
            let rightBoundToString
            let leftBoundToString
            if (this.ast.length === 1) {
                leftBoundToString = ""
                rightBoundToString = this.ast[0].join("")
            } else {
                leftBoundToString = `${this.ast[0][1]}${
                    invertedComparators[this.ast[0][0]]
                }`
                rightBoundToString = this.ast[1].join("")
            }
            return leftBoundToString + def + rightBoundToString
        }

        private addError(
            state: CheckState<BoundableData>,
            comparator: Comparator,
            limit: number,
            actual: number
        ) {
            const kind: BoundableKind =
                typeof state.data === "string"
                    ? "string"
                    : typeof state.data === "number"
                    ? "number"
                    : "array"
            state.errors.add(
                "bound",
                {
                    reason: describe(comparator, limit, kind),
                    state
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
        }
    }

    export type Diagnostic = Check.DiagnosticConfig<{
        comparator: Comparator
        comparatorDescription: string
        data: BoundableData
        limit: number
        actual: number
        kind: BoundableKind
    }>

    const describe = (
        comparator: Comparator,
        limit: number,
        kind: BoundableKind
    ) =>
        `Must be ${comparatorToString[comparator]} ${limit}${
            kind === "string" ? " characters" : kind === "array" ? " items" : ""
        }`

    export type BoundableData = number | string | unknown[]
    export type BoundableKind = "number" | "string" | "array"
    export type Units = "characters" | "items"

    const isWithinBound = (
        comparator: Comparator,
        limit: number,
        size: number
    ) => {
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
}
