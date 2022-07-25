import { References } from "../base.js"
import { Node } from "./node.js"
import { Parsing } from "./parsing.js"

export type ParseChildren = Node | Node[]

export abstract class NonTerminal<
    Children extends ParseChildren = Node
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
