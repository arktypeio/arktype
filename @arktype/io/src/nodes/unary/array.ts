import type { Base } from "../base/base.js"
import { Keyword, keywords } from "../terminal/keyword/keyword.js"
import type { TraversalState } from "../traversal/traversal.js"
import { Unary } from "./unary.js"

export namespace Array {
    export class Node extends Unary.Node {
        readonly kind = "array"

        constructor(public child: Base.Node) {
            super()
        }

        traverse(state: TraversalState) {
            if (!keywords.array.traverse(state)) {
                return false
            }
            if (Keyword.isTopType(this.child)) {
                return true
            }
            const length = state.data.length
            for (let i = 0; i < length; i++) {
                state.pushKey(i)
                this.child.traverse(state)
            }
        }

        toString() {
            return `${this.child.toString()}[]` as const
        }

        tupleWrap(next: unknown) {
            return [next, "[]"] as const
        }

        get mustBe() {
            return `${this.child.mustBe} array` as const
        }
    }
}
