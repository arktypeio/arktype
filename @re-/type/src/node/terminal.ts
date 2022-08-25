import { base } from "./base.js"
import { References } from "./traversal/index.js"

export abstract class terminalNode<
    defType extends string = string
> extends base {
    constructor(public def: defType) {
        super()
    }

    get tree() {
        return this.def
    }

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
