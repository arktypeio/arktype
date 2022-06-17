import type { Parser } from "../parser.js"
import { Allows, Generate } from "../traverse/index.js"
import { stringifyDef, stringifyValue } from "../utils.js"

export abstract class Base<DefType> {
    constructor(public def: DefType, public ctx: Parser.Context) {}

    abstract allows(args: Allows.Args): void
    abstract generate(args: Generate.Args): unknown

    stringifyDef() {
        return stringifyDef(this.def)
    }

    addUnassignable(args: Allows.Args) {
        args.errors.add(
            args.ctx.path,
            `${stringifyValue(
                args.value
            )} is not assignable to ${this.stringifyDef()}.`
        )
    }

    validateByPath(value: unknown, options?: Allows.Options) {
        const args = Allows.createArgs(value, options)
        this.allows(args)
        return args.errors.all()
    }
}
