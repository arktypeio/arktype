export * from "../../../../../parser/operator/common.js"
import { Node, StrNode } from "../../../../../parser/operator/common.js"

export type BranchToken = "|" | "&"

export type Branch<
    Left = unknown,
    Right = unknown,
    Token extends BranchToken = BranchToken
> = [Left, Token, Right]

export abstract class branch extends Nodes.base {
    constructor(
        protected children: Nodes.base[],
        protected ctx: Nodes.context
    ) {
        super()
    }

    abstract token: BranchToken

    get tree() {
        let root = this.children[0].tree
        for (let i = 1; i < this.children.length; i++) {
            root = [root, this.token, this.children[i].tree]
        }
        return root as Branch<StrNode, StrNode>
    }

    toString() {
        return (this.tree as string[]).flat(Infinity).join("")
    }

    collectReferences(
        opts: Nodes.References.Options,
        collected: Nodes.References.Collection
    ) {
        for (const child of this.children) {
            child.collectReferences(opts, collected)
        }
    }
}
