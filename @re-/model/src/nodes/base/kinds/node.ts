import { TreeOf } from "@re-/tools"
import { Generation, Parsing, Validation } from "../features/index.js"
import { References } from "../features/references.js"
import { defToString, stringifyValue } from "../utils.js"

export abstract class Node<DefType> {
    constructor(public def: DefType, public ctx: Parsing.Context) {}

    abstract allows(args: Validation.Args): boolean
    abstract generate(args: Generation.Args): unknown
    abstract references(args: References.Args): string[]

    /**
     * Get definition references organized according to the structure of the original definition.
     * Structured nodes like Record and Tuple should override this method.
     */
    structuredReferences(args: References.Args): TreeOf<string[]> {
        return this.references(args)
    }

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
