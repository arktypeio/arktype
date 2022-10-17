import type { Base } from "../base.js"
import type { TraversalState } from "../traversal/traversal.js"
import { Unary } from "./unary.js"

export namespace Optional {
    export class Node extends Unary.Node {
        readonly kind = "optional"

        constructor(public child: Base.Node) {
            super()
        }

        allows(state: TraversalState) {
            if (state.data !== undefined) {
                return this.child.allows(state)
            }
            return true
        }

        toString() {
            return `${this.child.toString()}?` as const
        }

        tupleWrap(next: unknown) {
            return [next, "?"] as const
        }

        get mustBe() {
            return `${this.child.mustBe} if defined` as const
        }
    }
}
