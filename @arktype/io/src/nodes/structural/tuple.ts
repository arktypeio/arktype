import { Base } from "../base/base.js"
import { keywords } from "../terminal/keyword/keyword.js"
import type { TraversalState } from "../traversal/traversal.js"
import { Bound } from "../unary/bound.js"

export namespace Tuple {
    export class Node extends Base.Node {
        readonly kind = "tuple"
        definitionRequiresStructure = true
        readonly length: number
        private precondition: Bound.RightNode

        constructor(public children: Base.Node[]) {
            super()
            this.length = children.length
            this.precondition = new Bound.RightNode(
                keywords.array,
                "==",
                this.length
            )
        }

        traverse(state: TraversalState) {
            if (!this.precondition.traverse(state)) {
                return
            }
            const elements: any = state.data
            for (let i = 0; i < this.length; i++) {
                state.path.push(String(i))
                state.data = elements[i]
                this.children[i].traverse(state)
                state.path.pop()
            }
            state.data = elements
        }

        get ast() {
            return this.children.map((child) => child.ast)
        }

        get definition() {
            return this.children.map((child) => child.definition)
        }

        toString() {
            if (!this.length) {
                return "[]"
            }
            let result = "["
            let i = 0
            for (i; i < this.length - 1; i++) {
                result += this.children[i] + ", "
            }
            return result + this.children[i] + "]"
        }

        get mustBe() {
            return `${this.length} elements`
        }
    }
}
