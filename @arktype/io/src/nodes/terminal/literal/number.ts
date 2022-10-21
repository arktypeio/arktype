import type { Base } from "../../base/base.js"
import { Terminal } from "../terminal.js"

export namespace NumberLiteral {
    export type Definition<Value extends number = number> = `${Value}`

    export type IntegerDefinition<Value extends bigint = bigint> = `${Value}`

    export class Node extends Terminal.Node {
        public definition: Definition
        readonly kind = "numberLiteral"

        constructor(public value: number) {
            super()
            this.definition = `${value}`
        }

        traverse(
            traversal: Base.Traversal
        ): traversal is Base.Traversal<this["value"]> {
            return traversal.data === this.value
        }

        get description() {
            return `${this.definition}` as const
        }
    }
}
