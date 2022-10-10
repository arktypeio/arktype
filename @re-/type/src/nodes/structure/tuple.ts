import { Base, Structure } from "../common.js"
import type { Check } from "../traverse/check.js"

export namespace Tuple {
    export class Node extends Base.Node {
        hasStructure = true

        constructor(public children: Base.Node[]) {
            super()
        }

        toAst() {
            return this.children.map((child) => child.toAst())
        }

        toDefinition() {
            return this.children.map((child) => child.toDefinition())
        }

        toString() {
            if (!this.children.length) {
                return "[]"
            }
            let result = "["
            let i = 0
            for (i; i < this.children.length - 1; i++) {
                result += this.children[i].toString() + ", "
            }
            // Avoid trailing comma
            return result + this.children[i].toString() + "]"
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

        private addTupleLengthError(
            state: Check.State<unknown[]>,
            expected: number,
            actual: number
        ) {
            state.addError("tupleLength", {
                type: this,
                message: `Length must be ${expected}`,
                expected,
                actual
            })
        }
    }

    export type LengthDiagnostic = Check.ConfigureDiagnostic<
        Node,
        {
            expected: number
            actual: number
        },
        {},
        unknown[]
    >
}
