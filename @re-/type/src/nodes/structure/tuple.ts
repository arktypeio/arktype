import { Base, ObjectKind } from "../base.js"
import type { Check } from "../traverse/check.js"

export namespace Tuple {
    export class Node extends Base.Node<"tuple"> {
        readonly kind = "tuple"
        hasStructure = true

        constructor(public children: Base.UnknownNode[]) {
            super()
        }

        get ast() {
            return this.children.map((child) => child.ast)
        }

        get definition() {
            return this.children.map((child) => child.definition)
        }

        toString() {
            if (!this.children.length) {
                return "[]"
            }
            let result = "["
            let i = 0
            for (i; i < this.children.length - 1; i++) {
                result += this.children[i] + ", "
            }
            return result + this.children[i] + "]"
        }

        get mustBe() {
            return `an array of length ${this.children.length}`
        }

        allows(state: Check.State) {
            if (!ObjectKind.check(this, "array", state)) {
                return
            }
            const expectedLength = this.children.length
            const actualLength = state.data.length
            if (expectedLength !== actualLength) {
                return
            }
        }
    }
}
