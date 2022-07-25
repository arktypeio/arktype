import { defToString, Parsing } from "../base.js"
import { Create, References, Validation } from "../features/index.js"
import { Node } from "./node.js"

export abstract class Terminal<DefType> implements Node {
    constructor(public def: DefType) {}

    abstract allows(args: Validation.Args): boolean
    abstract generate(args: Create.Args): unknown

    collectReferences(args: References.Args, collected: References.Collection) {
        const reference = defToString(this.def)
        if (!args.filter || args.filter(reference)) {
            collected.add(reference)
        }
    }
}
