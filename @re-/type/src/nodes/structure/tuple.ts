import { Base } from "../base.js"
import type { Check } from "../traverse/check.js"

export namespace Tuple {
    export class Node extends Base.Node {
        readonly kind = "tuple"
        definitionHasStructure = true

        constructor(public children: Base.Node[]) {
            super()
        }

        allows(data: unknown) {
            if (!ObjectKind.check(this, "array", state)) {
                return
            }
            const expectedLength = this.children.length
            const actualLength = state.data.length
            if (expectedLength !== actualLength) {
                return
            }
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
    }
}
