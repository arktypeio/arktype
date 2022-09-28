import type { Base } from "../base.js"
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
    constructor(typeDef: LiteralDefinition, public defValue: Value) {
        super(typeDef)
    }

    check(state: Check.CheckState) {
        if (state.data !== this.defValue) {
            state.errors.add(
                "literal",
                {
                    reason: `Must be ${this.typeDef}`,
                    state
                },
                {
                    definition: this.typeDef,
                    expected: this.defValue,
                    actual: Check.stringifyData(state.data),
                    data: state.data
                }
            )
        }
    }

    generate() {
        return this.defValue
    }
}

export type LiteralDiagnostic = Check.DiagnosticConfig<{
    definition: LiteralDefinition
    data: unknown
    expected: PrimitiveLiteralValue
    actual: string
}>
