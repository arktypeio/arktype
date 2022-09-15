import { Allows } from "../../traversal/allows.js"
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
                ? `"${this.value}"`
                : typeof value === "bigint"
                ? `${this.value}n`
                : String(this.value)
    }

    toString() {
        return this.definition
    }

    check(args: Allows.Args) {
        if (args.data === this.value) {
            return true
        }
        args.diagnostics.push(
            new Allows.UnassignableDiagnostic(this.toString(), args)
        )
        return false
    }

    create() {
        return this.value
    }
}
