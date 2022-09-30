import { Check } from "../traverse/exports.js"
import { TerminalNode } from "./terminal.js"

export namespace PrimitiveLiteral {
    export type Value = string | number | bigint | boolean

    export type Diagnostic = Check.DiagnosticConfig<{
        definition: string
        data: unknown
        expected: Value
        actual: string
    }>

    export class Node<
        Value extends PrimitiveLiteral.Value
    > extends TerminalNode {
        constructor(def: string, public value: Value) {
            super(def)
        }

        check(state: Check.CheckState) {
            if (state.data !== this.value) {
                state.errors.add(
                    "literal",
                    {
                        reason: `Must be ${this.def}`,
                        state
                    },
                    {
                        definition: this.def,
                        expected: this.value,
                        actual: Check.stringifyData(state.data),
                        data: state.data
                    }
                )
            }
        }

        generate() {
            return this.value
        }
    }

    export const Number = Node<number>
}
