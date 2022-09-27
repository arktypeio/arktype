import type { Check } from "../traverse/exports.js"
import type { Constraint } from "./constraint.js"

export class ModuloConstraint implements Constraint {
    constructor(public divisor: number) {}

    check(state: Check.CheckState<number>) {
        if (state.data % this.divisor !== 0) {
            state.errors.add(
                "modulo",
                {
                    state,
                    reason: `Must be divisible by ${this.divisor}`
                },
                { divisor: this.divisor, actual: state.data }
            )
        }
    }
}

export type ModuloDiagnostic = Check.DiagnosticConfig<{
    divisor: number
    actual: number
}>
