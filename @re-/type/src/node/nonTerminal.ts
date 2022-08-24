import { base, context } from "./base.js"
import { References } from "./traversal/index.js"

export type ParseChildren = base | base[]

export abstract class NonTerminal<
    Children extends ParseChildren = base
> extends base {
    constructor(protected children: Children, protected ctx: context) {
        super()
    }

    collectReferences(
        opts: References.Options,
        collected: References.Collection
    ) {
        if (Array.isArray(this.children)) {
            for (const child of this.children) {
                child.references(opts, collected)
            }
        } else {
            this.children.collectReferences(opts, collected)
        }
    }
}
