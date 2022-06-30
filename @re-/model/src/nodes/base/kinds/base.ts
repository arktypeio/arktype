import { Generation, Parsing, Validation } from "../features/index.js"
import { References } from "../features/references.js"
import { stringifyDef, stringifyValue } from "../utils.js"

export abstract class Node<DefType> {
    constructor(public def: DefType, public ctx: Parsing.Context) {}

    abstract allows(args: Validation.Args): void
    abstract generate(args: Generation.Args): unknown
    abstract references(args: References.Args): string[]
    abstract defToString(): string

    stringifyDef() {
        return stringifyDef(this.def)
    }

    addUnassignable(args: Validation.Args) {
        args.errors.add(
            args.ctx.path,
            `${stringifyValue(
                args.value
            )} is not assignable to ${this.stringifyDef()}.`
        )
    }
}
