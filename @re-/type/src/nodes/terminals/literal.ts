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

export type PrimitiveLiteralValue = string | number | bigint | boolean

export class LiteralNode<
    Value extends PrimitiveLiteralValue
> extends TerminalNode {
    constructor(public value: Value, context: Base.context) {
        const definition =
            typeof value === "string"
                ? value.includes(`"`)
                    ? `'${value}'`
                    : `"${value}"`
                : typeof value === "bigint"
                ? `${value}n`
                : String(value)
        super(definition, context)
    }

    toString() {
        return this.definition
    }

    check(args: Allows.Args) {
        if (args.data !== this.value) {
            args.diagnostics.add("literal", this.definition, args, {
                reason: `Must be ${this.definition}`
            })
        }
    }

    generate() {
        return this.value
    }
}
