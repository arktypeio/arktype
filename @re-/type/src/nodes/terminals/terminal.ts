import { Base } from "../base.js"
import type { References } from "../references.js"

export abstract class terminalNode extends Base.node<string> {
    get tree() {
        return this.definition
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
