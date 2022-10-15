import type { Base } from "../base.js"
import { Keyword, keywords } from "../terminal/keyword/keyword.js"
import type { TraversalState } from "../traversal/traversal.js"
import { Unary } from "./unary.js"

export namespace Array {
    export class Node extends Unary.Node {
        readonly kind = "array"

        constructor(public child: Base.Node) {
            super()
        }

        allows(data: unknown) {
            if (!keywords.array.allows(data)) {
                return false
            }
        }

        override next(state: TraversalState<unknown[]>) {
            if (Keyword.isTopType(this.child)) {
                return true
            }
            const rootData = state.data
            for (let i = 0; i < rootData.length; i++) {
                state.path.push(String(i))
                state.data = rootData[i] as any
                this.child.traverse(state)
                state.path.pop()
            }
            state.data = rootData
        }

        toString() {
            return `${this.child.toString()}[]` as const
        }

        tupleWrap(next: unknown) {
            return [next, "[]"] as const
        }

        get mustBe() {
            return "an array" as const
        }
    }
}
