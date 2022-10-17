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

        allows(state: TraversalState) {
            if (!keywords.array.allows(state)) {
                return false
            }
            if (Keyword.isTopType(this.child)) {
                return true
            }
            let allowsAllElements = true
            const elements = state.data
            for (let i = 0; i < elements.length; i++) {
                state.path.push(String(i))
                state.data = elements[i] as any
                if (!this.child.allows(state)) {
                    allowsAllElements = false
                }
                state.path.pop()
            }
            state.data = elements
            return allowsAllElements
        }

        toString() {
            return `${this.child.toString()}[]` as const
        }

        tupleWrap(next: unknown) {
            return [next, "[]"] as const
        }

        get mustBe() {
            return `${this.child.mustBe} array` as const
        }
    }
}
