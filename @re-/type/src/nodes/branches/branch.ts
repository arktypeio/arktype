import type { KeySet } from "@re-/tools"
import type { BranchToken } from "../../parser/str/operator/branch/branch.js"
import { Base } from "../base.js"
import type { StrAst, strNode } from "../common.js"
import type { References } from "../traverse/exports.js"

export type BranchAst<
    Left = unknown,
    Right = unknown,
    Token extends BranchToken = BranchToken
> = [Left, Token, Right]

export type BranchConstructorArgs = [children: strNode[], ctx: Base.context]

export abstract class BranchNode extends Base.node<string, StrAst> {
    protected children: strNode[]

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

    addMember(node: strNode) {
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
