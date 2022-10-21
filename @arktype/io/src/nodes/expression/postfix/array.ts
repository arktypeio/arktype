import type { Base } from "../../base/base.js"
import { hasKindIn, topKinds } from "../../base/kinds.js"
import { Keyword } from "../../terminal/keyword/keyword.js"
import { Postfix } from "./postfix.js"

export namespace Arr {
    export class Node extends Postfix.Node {
        readonly kind = "array"

        constructor(public child: Base.Node) {
            super()
        }

        traverse(traversal: Base.Traversal) {
            if (!Keyword.nodes.array.traverse(traversal)) {
                return
            }
            // TODO: Reenable
            if (hasKindIn(this.child, topKinds)) {
                return true
            }
            const length = traversal.data.length
            for (let i = 0; i < length; i++) {
                traversal.pushKey(i)
                this.child.traverse(traversal)
                traversal.popKey()
            }
        }

        toString() {
            return `${this.child.toString()}[]` as const
        }

        tupleWrap(next: unknown) {
            return [next, "[]"] as const
        }

        get description() {
            return `${this.child.description} array` as const
        }
    }
}
