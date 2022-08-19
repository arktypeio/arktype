import { Base } from "../parser/index.js"

export type ParseChildren = Base.Node | Base.Node[]

export abstract class NonTerminal<
    Children extends ParseChildren = Base.Node
> extends Base.Node {
    constructor(
        protected children: Children,
        protected ctx: Base.Parsing.Context
    ) {
        super()
    }

    collectReferences(
        opts: Base.References.Options,
        collected: Base.References.Collection
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
