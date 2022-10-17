import type { Base } from "../base.js"
import { keywords } from "../terminal/keyword/keyword.js"
import type { TraversalState } from "../traversal/traversal.js"
import { Unary } from "./unary.js"

export namespace Divisibility {
    export class Node extends Unary.Node {
        readonly kind = "divisibility"

        constructor(public child: Base.Node, public divisor: number) {
            super()
        }

        precondition = keywords.number

        traverse(data: number) {
            return data % this.divisor ? false : undefined
        }

        toString() {
            return `${this.child.toString()}%${this.divisor}` as const
        }

        tupleWrap(next: unknown) {
            return [next, "%", `${this.divisor}`] as const
        }

        get mustBe() {
            return `divisible by ${this.divisor}` as const
        }
    }
}
