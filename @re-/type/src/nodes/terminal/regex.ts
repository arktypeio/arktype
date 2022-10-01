import type { Check } from "../traverse/check/check.js"
import { Terminal } from "./terminal.js"

export namespace RegexLiteral {
    export type Definition<Source extends string = string> = `/${Source}/`

    export class Node extends Terminal.Node<Definition> {
        private expression: RegExp

        constructor(def: Definition) {
            super(def)
            this.expression = new RegExp(def.slice(1, -1))
        }

        check(state: Check.State<string>) {
            if (!this.expression.test(state.data)) {
                state.add("regexLiteral", {
                    type: this,
                    message: `Must match expression ${this.def}`
                })
            }
        }
    }

    export type Diagnostic = Check.DefineDiagnostic<Node, string>
}

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

        check(state: Check.State<string>) {
            if (!this.expression.test(state.data)) {
                state.add("regexKeyword", {
                    type: this,
                    message: this.description
                })
            }
        }
    }

    export type Diagnostic = Check.DefineDiagnostic<Node, string, {}>

    export const getPredefined = (keyword: Definition) => predefined[keyword]

    export const predefined: Record<Definition, Node> = {
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
}
