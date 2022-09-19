import { Base } from "../../base.js"
import type { StrNode, strNode } from "../../common.js"
import type { References } from "../../references.js"

export type Unary<Child = unknown, Modifier = unknown> = [Child, Modifier]

export abstract class unary<
    Child extends strNode = strNode
> extends Base.node<string> {
    constructor(protected child: Child, ...args: Base.ConstructorArgs<string>) {
        super(...args)
    }

    abstract get tree(): StrNode[]

    toString() {
        return this.definition
    }

    collectReferences(
        opts: References.Options,
        collected: References.Collection
    ) {
        this.child.collectReferences(opts, collected)
    }
}
