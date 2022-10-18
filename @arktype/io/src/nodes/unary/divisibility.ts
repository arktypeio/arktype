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

        traverse(state: TraversalState): boolean {
            // TODO: Figure out subtypes here
            if (!keywords.number.traverse(state)) {
                return false
            }
            const allowedByChild = this.child.traverse(state)
            const allowedByDivisbility =
                state.data % this.divisor === 0
                    ? true
                    : state.problems.add(this)
            return allowedByChild && allowedByDivisbility
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
