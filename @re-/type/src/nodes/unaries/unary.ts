import { Base } from "../base.js"
import type { StrAst, strNode } from "../common.js"
import type { References } from "../traverse/exports.js"

export type UnaryAst<Child = unknown, Modifier = unknown> = [Child, Modifier]

export type UnaryConstructorArgs = [child: strNode, context: Base.context]

export abstract class UnaryNode extends Base.node<string, StrAst> {
    protected child: strNode

    constructor(token: string, ...[child, context]: UnaryConstructorArgs) {
        super(`${child.definition}${token}`, [child.ast, token], context)
        this.child = child
    }

    toString() {
        return this.definition
    }

    collectReferences(
        opts: References.ReferencesOptions,
        collected: References.ReferenceCollection
    ) {
        this.child.collectReferences(opts, collected)
    }
}
