import { Base } from "../../../base/index.js"

export type PrimitiveLiteralValue = string | number | bigint

export abstract class PrimitiveLiteralNode<
    Value extends PrimitiveLiteralValue
> extends Base.Terminal {
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
