export * from "../common.js"
export * from "../parser/index.js"
import { Node, strNode, StrNode } from "../common.js"

export type Unary<Child = unknown, Modifier = unknown> = [Child, Modifier]

export abstract class unary<Child extends strNode = strNode> extends Node.base {
    constructor(protected child: Child, protected ctx: Node.context) {
        super()
    }

    abstract get tree(): StrNode[]

    toString() {
        return (this.tree as string[]).flat(Infinity).join("")
    }

    collectReferences(
        opts: Node.References.Options,
        collected: Node.References.Collection
    ) {
        this.child.collectReferences(opts, collected)
    }
}
