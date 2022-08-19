import { Create, References, Validation } from "../parser/features/index.js.js"
import { Node } from "../parser/parse/node.js.js"
import { defToString } from "../parser/utils.js.js"

export abstract class TerminalNode<DefType = string> extends Node {
    constructor(public def: DefType) {
        super()
    }

    abstract allows(args: Validation.Args): boolean
    abstract generate(args: Create.Args): unknown

    toString() {
        return defToString(this.def)
    }

    collectReferences(
        args: References.Options,
        collected: References.Collection
    ) {
        const reference = this.toString()
        if (!args.filter || args.filter(reference)) {
            collected[reference] = true
        }
    }
}
