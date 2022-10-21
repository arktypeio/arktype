import type { Base } from "../../base/base.js"
import { Terminal } from "../terminal.js"
import { TypeKeyword } from "./type.js"

export namespace NumericKeyword {
    class IntegerNode extends Terminal.Node {
        readonly kind = "integerKeyword"
        readonly definition = "integer"
        readonly description = "an integer"

        traverse(
            traversal: Base.Traversal
        ): traversal is Base.Traversal<number> {
            if (!TypeKeyword.nodes.number.traverse(traversal)) {
                return false
            }
            if (!Number.isInteger(traversal.data)) {
                traversal.addProblem(this)
                return false
            }
            return true
        }
    }

    export const nodes = {
        integer: new IntegerNode()
    }
}
