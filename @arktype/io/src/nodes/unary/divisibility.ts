import type { Base } from "../base/base.js"
import { keywords } from "../terminal/keyword/keyword.js"
import { Unary } from "./unary.js"

export namespace Divisibility {
    export class Node extends Unary.Node {
        readonly kind = "divisibility"

        constructor(public child: Base.Node, public divisor: number) {
            super()
        }

        traverse(state: Base.Traversal) {
            if (!keywords.number.traverse(state)) {
                return
            }
            if (state.data % this.divisor !== 0) {
                state.addProblem(this)
            }
        }

        toString() {
            return `${this.child.toString()}%${this.divisor}` as const
        }

        tupleWrap(next: unknown) {
            return [next, "%", `${this.divisor}`] as const
        }

        get mustBe() {
            return `${this.child.mustBe} divisible by ${this.divisor}` as const
        }
    }
}
