import type { Base } from "../base.js"
import { Keyword, keywords } from "../terminal/keyword/keyword.js"
import { Expression } from "./expression.js"

export namespace Array {
    export class Node extends Expression.Node<[Base.Node]> {
        readonly kind = "array"

        precondition = keywords.array

        allows(data: unknown[]) {
            if (Keyword.isTopType(this.children[0])) {
                return true
            }
            return data.length
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
