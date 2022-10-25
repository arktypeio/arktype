import type { Dictionary } from "../../utils/generics.js"
import { Base } from "../base/base.js"
import { Keyword } from "../terminal/keyword/keyword.js"

export namespace ObjectLiteral {
    export class Node extends Base.Node {
        readonly kind = "objectLiteral"
        readonly definitionRequiresStructure = true

        constructor(public children: Base.Node[], public keys: string[]) {
            super()
        }

        addAttributes(attributes: Base.Attributes) {
            attributes.add("type", "object")
            for (let i = 0; i < this.children.length; i++) {
                this.children[i].addAttributes(attributes.forProp(this.keys[i]))
            }
        }

        get definition() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].definition
            }
            return result
        }

        get ast() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].ast
            }
            return result
        }

        toString() {
            if (!this.children.length) {
                return "{}"
            }
            let result = "{"
            let i = 0
            for (i; i < this.children.length - 1; i++) {
                result +=
                    this.keys[i] + ": " + this.children[i].toString() + ", "
            }
            return result + this.children[i] + "}"
        }

        get description() {
            return this.toString()
        }
    }
}
