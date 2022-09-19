import { StrNode } from "../../parser/common.js"
import { Base } from "../base.js"
import { References } from "../references.js"

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
