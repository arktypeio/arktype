export * from "../common.js"
export * as Parser from "../parser/index.js"

import { Node } from "../common.js"

export type PrimitiveLiteralValue = string | number | bigint

export abstract class PrimitiveLiteralNode<
    Def extends string,
    Value extends PrimitiveLiteralValue
> extends Node.TerminalNode {
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
