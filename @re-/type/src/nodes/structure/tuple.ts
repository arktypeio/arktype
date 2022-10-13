import { Base, ObjectKind } from "../base.js"
import type { Check } from "../traverse/check.js"

export namespace Tuple {
    export class Node extends Base.Node<"tuple"> {
        readonly kind = "tuple"

        constructor(children: Base.UnknownNode[]) {
            super(children, true)
        }

        get ast() {
            return this.children.map((child) => child.ast)
        }

        get definition() {
            return this.children.map((child) => child.definition)
        }

        private buildString(stringifiedChildren: string[]) {
            if (!stringifiedChildren.length) {
                return "[]"
            }
            let result = "["
            let i = 0
            for (i; i < stringifiedChildren.length - 1; i++) {
                result += stringifiedChildren[i] + ", "
            }
            return result + stringifiedChildren[i] + "]"
        }

        toString() {
            return this.buildString(this.mapChildrenToStrings())
        }

        get description() {
            return this.buildString(this.mapChildrenToDescriptions())
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
