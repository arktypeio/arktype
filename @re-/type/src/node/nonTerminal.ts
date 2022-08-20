import { Base, Context } from "./base.js"
import { References } from "./methods/index.js"

export type ParseChildren = Base | Base[]

export abstract class NonTerminal<
    Children extends ParseChildren = Base
> extends Base {
    constructor(protected children: Children, protected ctx: Context) {
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
