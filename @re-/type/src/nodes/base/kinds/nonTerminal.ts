import { References } from "../base.js"
import { Parsing } from "../features/parsing.js"
import { Node } from "./node.js"

export type ParseChildren = Parsing.Node | Parsing.Node[]

export abstract class NonTerminal<
    Children extends ParseChildren = Parsing.Node
> extends Node {
    constructor(protected children: Children, protected ctx: Parsing.Context) {
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
