import type { TraversalState } from "../../traverse/traversal.js"
import type { Base } from "../base.js"
import { Unary } from "./unary.js"

export namespace Optional {
    export class Node extends Unary.Node {
        readonly kind = "optional"

        constructor(public child: Base.Node) {
            super()
        }

        traverse(state: TraversalState) {
            if (state.data !== undefined) {
                this.child.traverse(state)
            }
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
