import type {
    BoundableNode,
    BoundConstraint
} from "../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NumberNode extends TerminalNode implements BoundableNode {
    bounds: BoundConstraint | null = null

    check(state: Check.CheckState) {
        if (!state.dataIsOfType("number")) {
            if (this.definition === "number") {
                addTypeKeywordDiagnostic(state, "number", "Must be a number")
            } else {
                addTypeKeywordDiagnostic(
                    state,
                    "integer",
                    "Must be a number",
                    "number"
                )
            }

            return
        }
        if (this.definition === "integer" && !Number.isInteger(state.data)) {
            state.errors.add(
                "numberSubtype",
                { reason: "Must be an integer", state: state },
                {
                    definition: "integer",
                    actual: state.data
                }
            )
        }
        this.bounds?.check(state as Check.CheckState<number>)
    }

    generate() {
        if (this.bounds) {
            throw new ConstraintGenerationError(this.toString())
        }
        return 0
    }
}

export const numberTypedKeywords = {
    number: NumberNode,
    integer: NumberNode
}

export type NumberTypedKeyword = keyof typeof numberTypedKeywords

export type NumberSubtypeKeyword = Exclude<NumberTypedKeyword, "number">

export type NumberSubtypeDiagnostic = Check.DiagnosticConfig<{
    definition: NumberSubtypeKeyword
    actual: number
}>
