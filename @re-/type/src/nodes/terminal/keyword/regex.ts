import type { Check } from "../../traverse/check.js"
import { Terminal } from "../terminal.js"
import { TypeKeyword } from "./types/typeKeyword.js"

export namespace RegexKeyword {
    export type Definition =
        | "email"
        | "alpha"
        | "alphanumeric"
        | "lowercase"
        | "uppercase"

    export class Node extends Terminal.Node<Definition> {
        constructor(
            keyword: Definition,
            private description: string,
            private expression: RegExp
        ) {
            super(keyword)
        }

        allows(state: Check.State<string>) {
            if (
                TypeKeyword.allows("string", state) &&
                !this.expression.test(state.data)
            ) {
                state.addError("regexKeyword", {
                    type: this,
                    message: this.description,
                    expression: this.expression
                })
            }
        }
    }

    export const nodes: Record<Definition, Node> = {
        email: new Node("email", "Must be a valid email", /^(.+)@(.+)\.(.+)$/),
        alpha: new Node("alpha", "Must include only letters", /^[A-Za-z]+$/),
        alphanumeric: new Node(
            "alphanumeric",
            "Must include only letters and digits",
            /^[\dA-Za-z]+$/
        ),
        lowercase: new Node(
            "lowercase",
            "Must include only lowercase letters",
            /^[a-z]*$/
        ),
        uppercase: new Node(
            "uppercase",
            "Must include only uppercase letters",
            /^[A-Z]*$/
        )
    }

    export type Diagnostic = Check.ConfigureDiagnostic<
        Node,
        { expression: RegExp },
        {},
        string
    >
}
