import { Base } from "./base.js"
import { Allows, Create, References } from "./methods/index.js"

export abstract class TerminalNode<
    DefType extends string = string
> extends Base {
    constructor(public def: DefType) {
        super()
    }

    abstract allows(args: Allows.Args): boolean
    abstract create(args: Create.Args): unknown

    toString() {
        return this.def
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
