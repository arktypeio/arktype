import { Base } from "../base.js"
import type { Check } from "../traverse/check.js"

export namespace Tuple {
    export class Node extends Base.Node {
        readonly kind = "tuple"
        definitionHasStructure = true

        constructor(public children: Base.Node[]) {
            super()
        }

        allows(state: Check.State) {
            if (!Structure.checkKind(this, "array", state)) {
                return
            }
            const expectedLength = this.children.length
            const actualLength = state.data.length
            if (expectedLength !== actualLength) {
                this.addTupleLengthError(state, expectedLength, actualLength)
                return
            }
            this.checkChildren(state)
        }

        private checkChildren(state: Check.State) {
            const rootData: any = state.data
            for (let i = 0; i < this.children.length; i++) {
                state.path.push(String(i))
                state.data = rootData[i]
                this.children[i].allows(state)
                state.path.pop()
            }
            state.data = rootData
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
