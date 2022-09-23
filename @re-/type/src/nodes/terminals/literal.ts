import type { Allows } from "../allows.js"
import type { Base } from "../base.js"
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
    constructor(public value: Value, context: Base.context) {
        super(literalToDefinition(value), context)
    }

    toString() {
        return this.definition
    }

    check(args: Allows.Args) {
        if (args.data !== this.value) {
            args.diagnostics.add("literal", args, {
                definition: this.definition,
                data: args.data,
                value: this.value,
                reason: `Must be ${this.definition}`
            })
        }
    }

    generate() {
        return this.value
    }
}

const literalToDefinition = (value: PrimitiveLiteralValue) =>
    (typeof value === "string"
        ? value.includes(`"`)
            ? `'${value}'`
            : `"${value}"`
        : typeof value === "bigint"
        ? `${value}n`
        : String(value)) as LiteralDefinition

export type LiteralDiagnostic = Allows.DefineDiagnostic<
    "literal",
    {
        definition: LiteralDefinition
        data: unknown
        value: PrimitiveLiteralValue
    }
>
