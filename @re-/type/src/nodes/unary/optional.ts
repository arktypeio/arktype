import type { Base } from "../base.js"
import { Expression } from "../expression.js"

export namespace Optional {
    export class Node extends Expression.Node<[Base.Node]> {
        readonly kind = "optional"

        allows(state: Check.State) {
            if (state.data === undefined) {
                return
            }
            this.children[0].allows(state)
        }

        postcondition = this.children[0]

        toString() {
            return `${this.children[0].toString()}?` as const
        }

        toTuple(child: unknown) {
            return [child, "?"] as const
        }

        get mustBe() {
            return "anything" as const
        }
    }
}
