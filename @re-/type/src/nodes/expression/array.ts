import type { Base } from "../base.js"
import { ObjectKind } from "../base.js"
import { Keyword } from "../terminal/keyword.js"
import type { Check } from "../traverse/check.js"
import { Expression } from "./expression.js"

export namespace Arr {
    export class Node extends Expression.Node<[Base.Node], [unknown, "[]"]> {
        readonly kind = "array"

        allows(state: Check.State) {
            if (!ObjectKind.check(this, "array", state)) {
                return false
            }
            if (Keyword.isTopType(this.children[0])) {
                return true
            }
        }

        toString() {
            return `${this.children[0].toString()}[]` as const
        }

        toTuple(child: unknown) {
            return [child, "[]"] as const
        }

        get mustBe() {
            return "an array" as const
        }
    }
}
