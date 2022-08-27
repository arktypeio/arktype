export * from "../common.js"
export * as Parser from "../parser/index.js"
import { Node, strNode } from "../common.js"
import * as Parser from "../parser/index.js"

export namespace Operator {
    export type state = Parser.state<Parser.left.withRoot>

    export type Tree = (string | Tree)[]
}

export abstract class link<Child extends strNode = strNode> extends Node.base {
    constructor(protected child: Child, protected ctx: Node.context) {
        super()
    }

    abstract get tree(): Operator.Tree

    toString() {
        return this.tree.flatMap((_) => _).join("")
    }

    collectReferences(
        opts: Node.References.Options,
        collected: Node.References.Collection
    ) {
        this.child.collectReferences(opts, collected)
    }
}
