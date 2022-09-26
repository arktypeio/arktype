import type { KeySet } from "@re-/tools"
import { Base } from "../base.js"
import type { References } from "../traverse/exports.js"

export type UnaryConstructorArgs = [child: Base.node, ctx: Base.context]

export abstract class UnaryNode extends Base.node<string> {
    protected child: Base.node

    constructor(token: string, ...[child, context]: UnaryConstructorArgs) {
        super(`${child.def}${token}`, [child.ast, token], context)
        this.child = child
    }

    toString() {
        return this.def
    }

    collectReferences(opts: References.ReferencesOptions, collected: KeySet) {
        this.child.collectReferences(opts, collected)
    }
}
