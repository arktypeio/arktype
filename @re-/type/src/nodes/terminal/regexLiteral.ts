import type { Check } from "../traverse/check.js"
import { TypeKeyword } from "./keyword/types/typeKeyword.js"
import { Terminal } from "./terminal.js"

export namespace RegexLiteral {
    export type Definition<Source extends string = string> = `/${Source}/`

    export class Node extends Terminal.Node<Definition> {
        private expression: RegExp

        constructor(def: Definition) {
            super(def)
            this.expression = new RegExp(def.slice(1, -1))
        }

        allows(state: Check.State<string>) {
            if (
                TypeKeyword.allows("string", state) &&
                !this.expression.test(state.data)
            ) {
                state.addError("regexLiteral", {
                    type: this,
                    message: `Must match expression ${this.def}`,
                    expression: this.expression
                })
            }
        }
    }

    export type Diagnostic = Check.ConfigureDiagnostic<
        Node,
        { expression: RegExp },
        {},
        string
    >
}
