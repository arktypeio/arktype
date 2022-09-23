import { Base } from "../../base.js"
import type { StrAst, strNode } from "../../common.js"
import type { References } from "../../references.js"

export type Unary<Child = unknown, Modifier = unknown> = [Child, Modifier]

export type UnaryConstructorArgs = [child: strNode, context: Base.context]

export abstract class unary extends Base.node<string, StrAst> {
    protected child: strNode

    constructor(token: string, ...[child, context]: UnaryConstructorArgs) {
        super(`${child.definition}${token}`, [child.ast, token], context)
        this.child = child
    }

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
