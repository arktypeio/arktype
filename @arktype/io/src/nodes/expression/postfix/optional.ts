import type { Base } from "../../base/base.js"
import { Postfix } from "./postfix.js"

export namespace Optional {
    export class Node extends Postfix.Node {
        readonly kind = "optional"

        constructor(public child: Base.Node) {
            super()
        }

        traverse(traversal: Base.Traversal) {
            if (traversal.data !== undefined) {
                this.child.traverse(traversal)
            }
        }

        toString() {
            return `${this.child.toString()}?` as const
        }

        tupleWrap(next: unknown) {
            return [next, "?"] as const
        }

        get description() {
            return `${this.child.description} if defined` as const
        }
    }
}
