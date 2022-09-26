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
    constructor(
        definition: LiteralDefinition,
        public value: Value,
        context: Base.context
    ) {
        super(definition, context)
    }

    toString() {
        return this.def
    }

    check(state: Check.CheckState) {
        if (state.data !== this.value) {
            state.errors.add(
                "literal",
                {
                    reason: `Must be ${this.def}`,
                    state: state
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

export type LiteralDiagnostic = Check.DiagnosticConfig<{
    definition: LiteralDefinition
    data: unknown
    expected: PrimitiveLiteralValue
    actual: string
}>
