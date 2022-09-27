import type { StringSubtypeDefinition } from "../terminals/keywords/string.js"
import type { Check } from "../traverse/exports.js"
import type { Constraint } from "./constraint.js"

export class RegexConstraint implements Constraint {
    constructor(
        public expression: RegExp,
        private definition: StringSubtypeDefinition,
        private description: string
    ) {}

    check(state: Check.CheckState<string>) {
        if (!this.expression.test(state.data)) {
            state.errors.add(
                "regex",
                { reason: this.description, state: state },
                {
                    definition: this.definition,
                    data: state.data,
                    actual: `"${state.data}"`,
                    expression: this.expression
                }
            )
        }
    }
}

export type RegexDiagnostic = Check.DiagnosticConfig<{
    definition: StringSubtypeDefinition
    data: string
    expression: RegExp
    actual: `"${string}"`
}>
