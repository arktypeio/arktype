import type { TraversalState } from "../../traverse/traversal.js"
import type { Base } from "../base.js"
import { Unary } from "./unary.js"

export namespace Divisibility {
    export class Node extends Unary.Node {
        readonly kind = "divisibility"

        constructor(public child: Base.Node, public divisor: number) {
            super()
        }

        requires = "number"

        allows(data: number) {
            return data % this.divisor === 0
        }

        traverse(state: TraversalState) {}

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
