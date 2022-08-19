import { Base } from "../../base/index.js.js"
import { TerminalNode } from "../node.js"

export type PrimitiveLiteralValue = string | number | bigint

export abstract class PrimitiveLiteralNode<
    Def extends string,
    Value extends PrimitiveLiteralValue
> extends TerminalNode {
    constructor(public def: Def, public value: Value) {
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
