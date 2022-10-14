import type { Base } from "../base.js"
import { Keyword, keywords } from "../terminal/keyword/keyword.js"
import type { Check } from "../traverse/check.js"
import { Expression } from "./expression.js"

export namespace Arr {
    export class Node extends Expression.Node<[Base.Node], [unknown, "[]"]> {
        readonly kind = "array"

        allows(data: unknown) {
            if (!ObjectKind.check(this, "array", state)) {
                return false
            }
            if (Keyword.isTopType(this.children[0])) {
                return true
            }
            return
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

    export const unknownArray = new Node([keywords.unknown])
}
