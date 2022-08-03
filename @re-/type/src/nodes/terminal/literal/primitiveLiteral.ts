import { Base } from "../../base/index.js"
import { TerminalNode } from "../terminal.js"

export type PrimitiveLiteralValue = string | number | bigint

export abstract class PrimitiveLiteralNode<
    Value extends PrimitiveLiteralValue
> extends TerminalNode {
    constructor(public def: string, public value: Value) {
        super(def)
    }

    allows(args: Base.Validation.Args) {
        if (args.value === this.value) {
            return true
        }
        this.addUnassignable(args)
        return false
    }

    generate() {
        return this.value
    }
}
