import type { Base } from "../base/base.js"
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

        traverse(
            traversal: Base.Traversal
        ): traversal is Base.Traversal<string> {
            if (!keywords.string.traverse(traversal)) {
                return false
            }
            if (!this.expression.test(traversal.data)) {
                traversal.addProblem(this)
                return false
            }
            return true
        }

        get description() {
            // TODO: Check for name here?
            return `matched by ${this.definition}` as const
        }
    }
}
