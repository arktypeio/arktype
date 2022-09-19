import { Base } from "../base.js"
import type { StrNode } from "../common.js"
import type { References } from "../references.js"

export abstract class terminalNode extends Base.node {
    get tree(): StrNode {
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
