import { Base } from "../base/base.js"
import { Keyword } from "../terminal/keyword/keyword.js"

export namespace Tuple {
    export class Node extends Base.Node {
        readonly kind = "tuple"
        readonly definitionRequiresStructure = true
        readonly length: number

        constructor(public children: Base.Node[]) {
            super()
            this.length = children.length
        }

        addAttributes(attributes: Base.Attributes) {
            attributes.add("type", "array")
            for (let i = 0; i < this.children.length; i++) {
                this.children[i].addAttributes(attributes.forProp(i))
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
