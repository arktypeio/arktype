import { Allows } from "../../allows.js"
import { terminalNode } from "./terminal.js"

export type PrimitiveLiteralValue = string | number | bigint | boolean

export class literalNode<
    Value extends PrimitiveLiteralValue
> extends terminalNode {
    public definition: string

    constructor(public value: Value) {
        super()
        this.definition =
            typeof value === "string"
                ? // TODO: Is this right?
                  value.includes(`"`)
                    ? `'${this.value}'`
                    : `"${this.value}"`
                : typeof value === "bigint"
                ? `${this.value}n`
                : String(this.value)
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

    create() {
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
