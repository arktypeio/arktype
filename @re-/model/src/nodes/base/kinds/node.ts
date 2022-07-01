import { Generation, Parsing, Validation } from "../features/index.js"
import { References } from "../features/references.js"
import { defToString, stringifyValue } from "../utils.js"

export abstract class Node<DefType> {
    constructor(public def: DefType, public ctx: Parsing.Context) {}

    abstract allows(args: Validation.Args): boolean
    abstract generate(args: Generation.Args): unknown
    abstract references(args: References.Args): string[]

    defToString() {
        return defToString(this.def)
    }

    addUnassignable(args: Validation.Args) {
        args.errors.add(
            args.ctx.path,
            `${stringifyValue(
                args.value
            )} is not assignable to ${this.defToString()}.`
        )
    }
}
