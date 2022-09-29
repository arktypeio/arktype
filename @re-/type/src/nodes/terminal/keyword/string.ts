import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class StringNode extends TerminalNode<"string"> {
    constructor() {
        super("string")
    }

    check(state: Check.CheckState) {
        if (typeof state.data !== "string") {
            addTypeKeywordDiagnostic(state, "string", "Must be a string")
        }
    }

    generate() {
        return ""
    }
}

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
    )
}

export type Keyword = keyof typeof keywords

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
