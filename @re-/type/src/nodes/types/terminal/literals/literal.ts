import { Allows } from "../../../traversal/allows.js"
import { terminalNode } from "../terminal.js"

export type PrimitiveLiteralValue = string | number | bigint

export abstract class literalNode<
    Value extends PrimitiveLiteralValue
> extends terminalNode {
    constructor(public value: Value) {
        super()
    }

    allows(args: Allows.Args) {
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
