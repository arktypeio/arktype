import type { Check } from "../traverse/check.js"
import { Terminal } from "./terminal.js"

export namespace RegexLiteral {
    export type Definition<Source extends string = string> = `/${Source}/`

    export class Node extends Terminal.Node<"regexLiteral", Definition> {
        readonly kind = "regexLiteral"
        private expression: RegExp

        constructor(public definition: Definition) {
            super()
            this.expression = new RegExp(definition.slice(1, -1))
        }

        allows(state: Check.State) {
            if (!this.expression.test(state.data)) {
                return
            }
        }

        get mustBe() {
            return `matched by ${this.definition}` as const
        }
    }
}
