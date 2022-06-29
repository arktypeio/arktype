import type { Parser } from "../parser.js"
import { References } from "../references.js"
import { Allows, Generate } from "../traverse/index.js"
import { stringifyDef, stringifyValue } from "../utils.js"

export abstract class Base<DefType> {
    constructor(public def: DefType, public ctx: Parser.Context) {}

    abstract allows(args: Allows.Args): void
    abstract generate(args: Generate.Args): unknown
    // abstract references(args: References.Args): string[]
    // abstract defToString(): string

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
}
