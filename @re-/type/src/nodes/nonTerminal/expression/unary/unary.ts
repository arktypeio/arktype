import { parseContext, StrNode, strNode } from "../../../../parser/common.js"
import { Base } from "../../../base.js"
import { References } from "../../../references.js"

export type Unary<Child = unknown, Modifier = unknown> = [Child, Modifier]

export abstract class unary<Child extends strNode = strNode> extends Base.node {
    constructor(protected child: Child, protected ctx: parseContext) {
        super()
    }

    abstract get tree(): StrNode[]

    toString() {
        return (this.tree as string[]).flat(Infinity).join("")
    }

    collectReferences(
        opts: References.Options,
        collected: References.Collection
    ) {
        this.child.collectReferences(opts, collected)
    }
}
