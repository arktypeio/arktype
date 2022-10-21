import type { Base } from "../../base/base.js"
import { Terminal } from "../terminal.js"

export namespace BigintLiteral {
    export type Definition<Value extends bigint = bigint> = `${Value}n`

    export class Node extends Terminal.Node {
        public definition: Definition
        readonly kind = "bigintLiteral"

        constructor(public value: bigint) {
            super()
            this.definition = `${value}n`
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
