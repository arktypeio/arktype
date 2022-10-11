import type { Check } from "../../traverse/check.js"
import { Terminal } from "../terminal.js"
import { TypeKeyword } from "./types/typeKeyword.js"

export namespace RegexKeyword {
    export type Definition =
        | "email"
        | "alphaonly"
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

        get description() {
            return this.description
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
        email: new Node("email", "a valid email", /^(.+)@(.+)\.(.+)$/),
        alphaonly: new Node(
            "alphaonly",
            "a string including only letters",
            /^[A-Za-z]+$/
        ),
        alphanumeric: new Node(
            "alphanumeric",
            "an alphanumeric string",
            /^[\dA-Za-z]+$/
        ),
        lowercase: new Node(
            "lowercase",
            "a string of lowercase letters",
            /^[a-z]*$/
        ),
        uppercase: new Node(
            "uppercase",
            "a string of uppercase letters",
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
