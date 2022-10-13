import type { Base } from "../base.js"
import { Expression } from "./expression.js"

export namespace Optional {
    export class Node extends Expression.Node<
        [Base.UnknownNode],
        [unknown, "?"]
    > {
        readonly kind = "optional"

        allows(data: unknown) {
            if (data === undefined) {
                return true
            }
        }

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
