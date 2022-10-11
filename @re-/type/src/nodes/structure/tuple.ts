import { Base, ObjectKind } from "../common.js"
import type { Check } from "../traverse/check.js"

export namespace Tuple {
    export class Node extends Base.Node {
        constructor(children: Base.Node[]) {
            super(children, true)
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
                result += this.children[i].toString() + ", "
            }
            return result + this.children[i].toString() + "]"
        }

        allows(state: Check.State) {
            if (!ObjectKind.check(this, "array", state)) {
                return
            }
            const expectedLength = this.children.length
            const actualLength = state.data.length
            if (expectedLength !== actualLength) {
                this.addTupleLengthError(state, expectedLength, actualLength)
                return
            }
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
