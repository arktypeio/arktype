import type { Check } from "../traverse/check.js"
import { Keyword } from "./keyword.js"
import { Terminal } from "./terminal.js"

export namespace RegexLiteral {
    export type Definition<Source extends string = string> = `/${Source}/`

    export class Node extends Terminal.Node {
        readonly kind = "regexLiteral"
        private expression: RegExp

        constructor(public definition: Definition) {
            super()
            this.expression = new RegExp(definition.slice(1, -1))
        }

        allows(data: string) {
            if (!this.expression.test(data)) {
                return
            }
        }

        precondition = Keyword.getNode("string")

        get mustBe() {
            return `matched by ${this.definition}` as const
        }
    }
}
