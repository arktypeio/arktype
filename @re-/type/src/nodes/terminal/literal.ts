import { Check } from "../traverse/exports.js"
import { TerminalNode } from "./terminal.js"

export namespace PrimitiveLiteral {
    export type Value = string | number | bigint | boolean

    export type String<Text extends string = string> = `"${Text}"` | `'${Text}'`

    export type Number<Value extends number = number> = Value

    export type Bigint<Value extends bigint = bigint> = `${Value}n`

    export type Boolean<Value extends boolean = boolean> = `${Value}`

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

    // TODO: Can this work?
    export const Number = Node<number>
}
