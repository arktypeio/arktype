import { Allows } from "../allows.js"
import type { Base } from "../base.js"
import { terminalNode } from "./terminal.js"

export type PrimitiveLiteralValue = string | number | bigint | boolean

export class literalNode<
    Value extends PrimitiveLiteralValue
> extends terminalNode {
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
            args.diagnostics.push(new LiteralDiagnostic(this.toString(), args))
        }
        return false
    }

    generate() {
        return this.value
    }
}

export class LiteralDiagnostic extends Allows.Diagnostic<"Literal"> {
    public message: string

    constructor(public type: string, args: Allows.Args) {
        super("Literal", args)
        this.message = `Must be ${type} (got ${Allows.stringifyData(
            this.data
        )}).`
    }
}
