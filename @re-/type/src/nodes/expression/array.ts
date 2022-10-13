import type { Base } from "../base.js"
import { ObjectKind } from "../base.js"
import type { Check } from "../traverse/check.js"
import { Expression } from "./expression.js"

export namespace Arr {
    export class Node extends Expression.Node<
        [Base.UnknownNode],
        [unknown, "[]"]
    > {
        readonly kind = "array"

        allows(state: Check.State) {
            if (!ObjectKind.check(this, "array", state)) {
                return false
            }
            const rootData: any[] = state.data
            for (let i = 0; i < rootData.length; i++) {
                state.path.push(String(i))
                state.data = rootData[i]
                this.children[0].allows(state)
                state.path.pop()
            }
            state.data = rootData
        }

        toString() {
            return `${this.children[0].toString()}[]` as const
        }

        toTuple(child: unknown) {
            return [child, "[]"] as const
        }

        get description() {
            return `${this.children[0].description} array` as const
        }

        get checks() {
            return "an array" as const
        }
    }
}
