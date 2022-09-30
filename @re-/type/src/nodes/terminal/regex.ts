import type { Check } from "../traverse/check/check.js"
import { Terminal } from "./terminal.js"

export namespace Regex {
    export type Definition = PredefinedKeyword | LiteralDefinition

    export type PredefinedKeyword =
        | "email"
        | "alpha"
        | "alphanumeric"
        | "lowercase"
        | "uppercase"

    export type LiteralDefinition<Source extends string = string> =
        `/${Source}/`

    export class Node extends Terminal.Node<Definition> {
        constructor(
            private expression: RegExp,
            def: Definition,
            private description = `Must match expression /${expression.source}/`
        ) {
            super(def)
        }

        check(state: Check.State<string>) {
            if (!this.expression.test(state.data)) {
                state.errors.add(
                    "regex",
                    { reason: this.description, state },
                    {
                        expression: this.expression.source,
                        actual: state.data,
                        keyword:
                            this.def in predefined
                                ? (this.def as PredefinedKeyword)
                                : undefined
                    }
                )
            }
        }
    }

    export type Diagnostic = Check.DefineDiagnostic<{
        expression: string
        actual: string
        keyword: PredefinedKeyword | undefined
    }>

    export const getPredefined = (keyword: PredefinedKeyword) =>
        predefined[keyword]

    export const predefined: Record<PredefinedKeyword, Node> = {
        email: new Node(/^(.+)@(.+)\.(.+)$/, "email", "Must be a valid email"),
        alpha: new Node(/^[A-Za-z]+$/, "alpha", "Must include only letters"),
        alphanumeric: new Node(
            /^[\dA-Za-z]+$/,
            "alphanumeric",
            "Must include only letters and digits"
        ),
        lowercase: new Node(
            /^[a-z]*$/,
            "lowercase",
            "Must include only lowercase letters"
        ),
        uppercase: new Node(
            /^[A-Z]*$/,
            "uppercase",
            "Must include only uppercase letters"
        )
    }
}
