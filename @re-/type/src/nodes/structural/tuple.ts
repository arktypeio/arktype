import type { Base } from "../base.js"
import type { Check } from "../traverse/check/check.js"

import { checkObjectKind } from "./common.js"

export namespace Tuple {
    export class Node implements Base.Node {
        constructor(public children: Base.Node[]) {}

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

        check(state: Check.State) {
            if (!checkObjectKind(this.toString(), "array", state)) {
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
                state.path.push(i)
                state.data = rootData[i]
                this.children[i].check(state)
                state.path.pop()
            }
            state.data = rootData
        }

        private addTupleLengthError(
            state: Check.State<unknown[]>,
            expected: number,
            actual: number
        ) {
            state.errors.add(
                "tupleLength",
                {
                    reason: `Length must be ${expected}`,
                    state
                },
                {
                    definition: this.toDefinition(),
                    data: state.data,
                    expected,
                    actual
                }
            )
        }
    }

    export type LengthDiagnostic = Check.DiagnosticConfig<{
        definition: string
        data: unknown[]
        expected: number
        actual: number
    }>
}
