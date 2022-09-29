import type { Check } from "../../traverse/exports.js"
import type { Constraining } from "./constraining.js"

export namespace Regex {
    export class Constraint implements Constraining.Constraint {
        constructor(private expression: RegExp) {}

        check(state: Check.CheckState<string>) {
            if (!this.expression.test(state.data)) {
                state.errors.add(
                    "regex",
                    { reason: this.description, state },
                    {
                        data: state.data,
                        expression: this.expression
                    }
                )
            }
        }
    }

    export type Diagnostic = Check.DiagnosticConfig<{
        data: string
        expression: RegExp
    }>

    const predefined = {
        email: {
            expression: /^(.+)@(.+)\.(.+)$/,
            description: "Must be a valid email"
        },
        alpha: {
            expression: /^[A-Za-z]+$/,
            description: "Must include only letters"
        },
        alphanumeric: {
            expression: /^[\dA-Za-z]+$/,
            description: "Must include only letters and digits"
        },
        lowercase: {
            expression: /^[a-z]*$/,
            description: "Must include only lowercase letters"
        },
        uppercase: {
            expression: /^[A-Z]*$/,
            description: "Must include only uppercase letters"
        }
    }

    export type Keyword = keyof typeof predefined
}
