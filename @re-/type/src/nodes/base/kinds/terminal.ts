import { defToString, Parsing } from "../base.js"
import { Create, References, Validation } from "../features/index.js"
import { Node } from "./node.js"

export abstract class Terminal<DefType> extends Node {
    constructor(public def: DefType) {
        super()
    }

    abstract allows(args: Validation.Args): boolean
    abstract generate(args: Create.Args): unknown

    toString() {
        return typeof this.def === "string" ? this.def : String(this.def)
    }

    collectReferences(args: References.Args, collected: References.Collection) {
        const reference = defToString(this.def)
        if (!args.filter || args.filter(reference)) {
            collected.add(reference)
        }
    }
}
