import { Check } from "../traverse/exports.js"
import { TerminalNode } from "./terminal.js"

export type StringLiteralDefinition<Text extends string = string> =
    | `'${Text}'`
    | `"${Text}"`

export type NumberLiteralDefinition<Value extends number = number> = `${Value}`

export type BigintLiteralDefinition<Value extends bigint = bigint> = `${Value}n`

export type BooleanLiteralDefinition<Value extends boolean = boolean> =
    `${Value}`

export type LiteralDefinition =
    | StringLiteralDefinition
    | NumberLiteralDefinition
    | BigintLiteralDefinition
    | BooleanLiteralDefinition

export type PrimitiveLiteralValue = string | number | bigint | boolean

export class LiteralNode<
    Value extends PrimitiveLiteralValue
> extends TerminalNode<LiteralDefinition> {
    constructor(def: LiteralDefinition, public value: Value) {
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
                    definition: this.toIsomorphicDef(),
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

export type LiteralDiagnostic = Check.DiagnosticConfig<{
    definition: LiteralDefinition
    data: unknown
    expected: PrimitiveLiteralValue
    actual: string
}>
