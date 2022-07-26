import { Create, References, Validation } from "../features/index.js"
import { defToString } from "../utils.js"
import { Node } from "./node.js"

export abstract class Terminal<DefType = string> extends Node {
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
