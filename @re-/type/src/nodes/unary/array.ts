import type { Base } from "../../base.js"
import { Keyword, keywords } from "../../terminal/keyword/keyword.js"
import type { Check } from "../../traverse/check.js"
import { Expression } from "../expression.js"

export namespace Array {
    export class Node extends Expression.Node<[Base.Node]> {
        readonly kind = "array"

        precondition = keywords.array

        allows(state: Check.State) {
            if (Keyword.isTopType(this.children[0])) {
                return true
            }
            const rootData = state.data
            for (let i = 0; i < rootData.length; i++) {
                state.path.push(String(i))
                state.data = rootData[i] as any
                this.child.allows(state)
                state.path.pop()
            }
            state.data = rootData
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
