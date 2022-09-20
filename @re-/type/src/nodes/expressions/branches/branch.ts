import { Base } from "../../base.js"
import type { strNode } from "../../common.js"
import type { References } from "../../references.js"

export type BranchToken = "|" | "&"

export type Branch<
    Left = unknown,
    Right = unknown,
    Token extends BranchToken = BranchToken
> = [Left, Token, Right]

export abstract class branch extends Base.node {
    constructor(
        protected token: BranchToken,
        protected children: Base.node[],
        context: Base.context
    ) {
        const definition = children
            .map(({ definition }) => definition)
            .join(token)
        let tree = children[0].tree
        for (let i = 1; i < children.length; i++) {
            tree = [tree, token, children[i].tree]
        }
        super(definition, tree, context)
    }

    addMember(node: strNode) {
        this.children.push(node)
        this.definition += this.token + node.definition
        this.tree = [this.tree, this.token, node.tree]
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
