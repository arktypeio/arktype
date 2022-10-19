import { Base } from "../base/base.js"
import { keywords } from "../terminal/keyword/keyword.js"
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

        traverse(traversal: Base.Traversal) {
            if (!this.precondition.traverse(traversal)) {
                return
            }
            const elements: any = traversal.data
            for (let i = 0; i < this.length; i++) {
                traversal.path.push(String(i))
                traversal.data = elements[i]
                this.children[i].traverse(traversal)
                traversal.path.pop()
            }
            traversal.data = elements
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
