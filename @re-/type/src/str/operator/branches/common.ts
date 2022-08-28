export * from "../common.js"
import { Node, StrNode } from "../common.js"

export type BranchToken = "|" | "&"

// Union or Intersection
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
        let tree = this.children[this.children.length - 1].tree
        for (let i = this.children.length - 2; i >= 0; i--) {
            tree = [this.children[i].tree, this.token, tree]
        }
        return tree as StrNode
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
