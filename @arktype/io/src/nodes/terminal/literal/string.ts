import type { Base } from "../../base/base.js"
import { Terminal } from "../terminal.js"

export namespace StringLiteral {
    export type Definition<
        Text extends string = string,
        EnclosedBy extends Quote = Quote
    > = `${EnclosedBy}${Text}${EnclosedBy}`

    export type Quote = "'" | '"'

    export class Node extends Terminal.Node {
        public definition: Definition
        readonly kind = "stringLiteral"

        constructor(public value: string, public quote: Quote) {
            super()
            this.definition = `${quote}${value}${quote}`
        }

        traverse(
            traversal: Base.Traversal
        ): traversal is Base.Traversal<this["value"]> {
            return traversal.data === this.value
        }

        get description() {
            return this.definition
        }
    }
}
