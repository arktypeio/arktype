import type { Base } from "../base/base.js"
import { keywords } from "../terminal/keyword/keyword.js"
import { Unary } from "./unary.js"

export namespace Divisibility {
    export class Node extends Unary.Node implements Base.ProblemSource {
        readonly kind = "divisibility"

        constructor(public child: Base.Node, public divisor: number) {
            super()
        }

        traverse(traversal: Base.Traversal) {
            if (!keywords.number.traverse(traversal)) {
                return
            }
            if (traversal.data % this.divisor !== 0) {
                traversal.addProblem(this)
            }
        }

        toString() {
            return `${this.child.toString()}%${this.divisor}` as const
        }

        tupleWrap(next: unknown) {
            return [next, "%", `${this.divisor}`] as const
        }

        get description() {
            return `${this.child.description} ${this.mustBe}` as const
        }

        get mustBe() {
            return `divisible by ${this.divisor}` as const
        }
    }
}
