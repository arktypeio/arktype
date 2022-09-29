import type { Check } from "../../traverse/exports.js"
import type { Constraining } from "./constraining.js"
import { Divisibility } from "./divisibility.js"

export namespace Regex {
    export class Constraint implements Constraining.Constraint {
        constructor(
            private expression: RegExp,
            private definition: StringSubtypeDefinition,
            private description: string
        ) {}

        check(state: Check.CheckState<string>) {
            if (!this.expression.test(state.data)) {
                state.errors.add(
                    "regex",
                    { reason: this.description, state },
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

    export type Diagnostic = Check.DiagnosticConfig<{
        definition: StringSubtypeDefinition
        data: string
        expression: RegExp
        actual: `"${string}"`
    }>

    export const keywords = {
        email: new Regex.Constraint(
            /^(.+)@(.+)\.(.+)$/,
            "email",
            "Must be a valid email"
        ),
        alpha: new Regex.Constraint(
            /^[A-Za-z]+$/,
            "alpha",
            "Must include only letters"
        ),
        alphanumeric: new Regex.Constraint(
            /^[\dA-Za-z]+$/,
            "alphanumeric",
            "Must include only letters and digits"
        ),
        lowercase: new Regex.Constraint(
            /^[a-z]*$/,
            "lowercase",
            "Must include only lowercase letters"
        ),
        uppercase: new Regex.Constraint(
            /^[A-Z]*$/,
            "uppercase",
            "Must include only uppercase letters"
        ),
        integer: new Divisibility.Constraint(1)
    }

    export type Keyword = keyof typeof keywords
}
