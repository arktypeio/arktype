import { StrNode } from "../../../../../parser/common.js"
import { Base } from "../../../../base.js"
import { References } from "../../../../traversal/references.js"

export type BranchToken = "|" | "&"

export type Branch<
    Left = unknown,
    Right = unknown,
    Token extends BranchToken = BranchToken
> = [Left, Token, Right]

export abstract class branch extends Base.node {
    constructor(protected children: Base.node[], protected ctx: Base.context) {
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
        opts: References.Options,
        collected: References.Collection
    ) {
        for (const child of this.children) {
            child.collectReferences(opts, collected)
        }
    }
}
