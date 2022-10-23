import type { ArktypeConfig } from "../../../type.js"
import type { Base } from "../../base/base.js"
import { Infix } from "./infix.js"

export namespace Scope {
    export class Node extends Infix.Node {
        readonly kind = "scope"

        constructor(public child: Base.Node, public config: ArktypeConfig) {
            super()
        }

        traverse(traversal: Base.Traversal) {
            traversal.pushScope(this)
            this.child.traverse(traversal)
            traversal.popScope()
        }

        toString() {
            return this.child.toString()
        }

        tupleWrap(next: unknown) {
            return [next, "$", this.config] as const
        }

        get description() {
            return this.child.description
        }
    }
}
