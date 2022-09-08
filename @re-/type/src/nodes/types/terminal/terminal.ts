import { base } from "../../base/base.js"

export abstract class terminalNode extends base {
    get tree() {
        return this.toString()
    }

    collectReferences(
        args: References.Options,
        collected: Nodes.References.Collection
    ) {
        const reference = this.toString()
        if (!args.filter || args.filter(reference)) {
            collected[reference] = true
        }
    }
}
