import type {
    BoundableNode,
    BoundConstraint
} from "../../constraints/bounds.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class ModuloConstraint {
    constructor(public value: number) {}

    check(state: Check.CheckState<number>) {
        if (state.data % this.value !== 0) {
            state.errors.add(
                "modulo",
                {
                    state,
                    reason: `Must be divisible by ${this.value}`
                },
                { divisor: this.value, actual: state.data }
            )
        }
    }
}

export class NumberNode extends TerminalNode implements BoundableNode {
    bounds: BoundConstraint | null = null
    modulo: ModuloConstraint | null = null

    check(state: Check.CheckState) {
        if (!state.dataIsOfType("number")) {
            if (this.def === "number") {
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
        if (this.def === "integer" && !Number.isInteger(state.data)) {
            state.errors.add(
                "numberSubtype",
                { reason: "Must be an integer", state: state },
                {
                    definition: "integer",
                    actual: state.data
                }
            )
        }
        this.modulo?.check(state)
        this.bounds?.check(state)
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

export type ModuloDiagnostic = Check.DiagnosticConfig<{
    divisor: number
    actual: number
}>
