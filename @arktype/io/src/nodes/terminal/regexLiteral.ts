import type { TraversalState } from "../traversal/traversal.js"
import { keywords } from "./keyword/keyword.js"
import { Terminal } from "./terminal.js"

export namespace RegexLiteral {
    export type Definition<Source extends string = string> = `/${Source}/`

    export class Node extends Terminal.Node {
        readonly kind = "regexLiteral"
        public expression: RegExp

        constructor(public definition: Definition) {
            super()
            this.expression = new RegExp(definition.slice(1, -1))
        }

        traverse(state: TraversalState): state is TraversalState<string> {
            return (
                keywords.string.traverse(state) &&
                this.expression.test(state.data)
            )
        }

        get mustBe() {
            return `matched by ${this.definition}` as const
        }
    }
}
