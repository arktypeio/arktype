import type { Parser } from "../parse.js"
import type { Allows, Generate } from "../traverse/index.js"
import { stringifyDef } from "../utils.js"

export abstract class Base<DefType> {
    constructor(public def: DefType, public ctx: Parser.Context) {}

    abstract allows(args: Allows.Args): void
    abstract generate(args: Generate.Args): unknown

    stringifyDef() {
        return stringifyDef(this.def)
    }
}
