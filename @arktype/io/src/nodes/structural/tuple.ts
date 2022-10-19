import { Base } from "../base/base.js"
import { keywords } from "../terminal/keyword/keyword.js"

export namespace Tuple {
    export class Node extends Base.Node {
        readonly kind = "tuple"
        definitionRequiresStructure = true
        readonly length: number

        constructor(public children: Base.Node[]) {
            super()
            this.length = children.length
        }

        traverse(traversal: Base.Traversal) {
            if (!keywords.array.traverse(traversal)) {
                return
            }
            for (let i = 0; i < this.length; i++) {
                traversal.pushKey(i)
                this.children[i].traverse(traversal)
                traversal.popKey()
            }
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

        get description() {
            return this.toString()
        }
    }
}
