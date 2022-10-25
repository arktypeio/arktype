import type { Base } from "../../base/base.js"
import { Keyword } from "../keyword/keyword.js"
import { Terminal } from "../terminal.js"

export namespace RegexLiteral {
    export type Definition<Source extends string = string> = `/${Source}/`

    export class Node extends Terminal.Node {
        readonly kind = "regexLiteral"
        expression: RegExp

        constructor(public definition: Definition) {
            super()
            this.expression = new RegExp(definition.slice(1, -1))
        }

        addAttributes(attributes: Base.Attributes) {
            attributes.add("regex", this.expression)
        }

        get description() {
            // TODO: Check for name here?
            return `matched by ${this.definition}` as const
        }
    }
}
