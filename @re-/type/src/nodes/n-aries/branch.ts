import type { KeySet } from "@re-/tools"
import type { BranchToken } from "../../parser/str/operator/binary/branch.js"
import { Base } from "../base.js"
import type { References } from "../traverse/exports.js"

export type BranchConstructorArgs = [children: Base.node[], ctx: Base.context]

export abstract class NaryNode extends Base.node<string> {
    protected children: Base.node[]

    constructor(
        protected token: BranchToken,
        ...[children, context]: BranchConstructorArgs
    ) {
        const definition = children
            .map(({ definition }) => definition)
            .join(token)
        let ast = children[0].ast
        for (let i = 1; i < children.length; i++) {
            ast = [ast, token, children[i].ast]
        }
        super(definition, ast, context)
        this.children = children
    }

    addMember(node: Base.node) {
        this.children.push(node)
        this.definition += this.token + node.definition
        this.ast = [this.ast, this.token, node.ast]
    }

    toString() {
        return (this.ast as string[]).flat(Infinity).join("")
    }

    collectReferences(opts: References.ReferencesOptions, collected: KeySet) {
        for (const child of this.children) {
            child.collectReferences(opts, collected)
        }
    }
}
