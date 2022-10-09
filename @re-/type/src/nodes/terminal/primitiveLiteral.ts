import type { Check } from "../traverse/check.js"
import { Terminal } from "./terminal.js"

export namespace PrimitiveLiteral {
    export type Value = string | number | bigint | boolean

    export type String<Text extends string = string> = `"${Text}"` | `'${Text}'`

    export type Number<Value extends number = number> = `${Value}`

    export type Bigint<Value extends bigint = bigint> = `${Value}n`

    export type Boolean<Value extends boolean = boolean> = `${Value}`

    export type Definition = String | Number | Bigint | Boolean

    export type Diagnostic = Check.ConfigureDiagnostic<
        Node<Value>,
        {
            expectedValue: PrimitiveLiteral.Value
        }
    >

    export type ValueToDefinition<Value extends PrimitiveLiteral.Value> =
        Value extends string
            ? String<Value>
            : Value extends bigint
            ? Bigint<Value>
            : `${Value}`

    export class Node<
        Value extends PrimitiveLiteral.Value,
        Def extends Definition = ValueToDefinition<Value>
    > extends Terminal.Node<Def> {
        constructor(def: Def, public value: Value) {
            super(def)
        }

        check(state: Check.State) {
            if (state.data !== this.value) {
                state.addError("primitiveLiteral", {
                    message: `Must be ${this.def}`,
                    expectedValue: this.value,
                    type: this
                })
            }
        }
    }
}
