import { Base } from "../../base.js"
import { References } from "../../traversal/references.js"

export abstract class terminalNode extends Base.node {
    get tree() {
        return this.toString()
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
