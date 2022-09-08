export * from "../common.js"
export * from "../parser/index.js"
import { Node, strNode, StrNode } from "../common.js"

export type Unary<Child = unknown, Modifier = unknown> = [Child, Modifier]

export abstract class unary<
    Child extends strNode = strNode
> extends Nodes.base {
    constructor(protected child: Child, protected ctx: Nodes.context) {
        super()
    }

    abstract get tree(): StrNode[]

    toString() {
        return (this.tree as string[]).flat(Infinity).join("")
    }

    collectReferences(
        opts: Nodes.References.Options,
        collected: Nodes.References.Collection
    ) {
        this.child.collectReferences(opts, collected)
    }
}
