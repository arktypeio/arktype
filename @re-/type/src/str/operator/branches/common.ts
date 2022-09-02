export * from "../common.js"
import { Node, StrNode } from "../common.js"

export type BranchToken = "|" | "&"

export type Branch<
    Left = unknown,
    Right = unknown,
    Token extends BranchToken = BranchToken
> = [Left, Token, Right]

export abstract class branch extends Node.base {
    constructor(protected children: Node.base[], protected ctx: Node.context) {
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
        opts: Node.References.Options,
        collected: Node.References.Collection
    ) {
        for (const child of this.children) {
            child.collectReferences(opts, collected)
        }
    }
}
