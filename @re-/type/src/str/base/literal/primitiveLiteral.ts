import { TerminalNode } from "../../../node/terminal.js"
import { Base } from "../../parser/index.js.js"

export type PrimitiveLiteralValue = string | number | bigint

export abstract class PrimitiveLiteralNode<
    Def extends string,
    Value extends PrimitiveLiteralValue
> extends TerminalNode {
    constructor(public def: Def, public value: Value) {
        super(def)
    }

    allows(args: Node.Allows.Args) {
        if (args.value === this.value) {
            return true
        }
        this.addUnassignable(args)
        return false
    }

    create() {
        return this.value
    }
}
