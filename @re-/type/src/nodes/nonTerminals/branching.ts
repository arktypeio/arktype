import type { BranchToken } from "../../parser/str/operator/binary/branch.js"
import type { Base } from "../base.js"
import { NonTerminalNode } from "./nonTerminal.js"

export type BinaryAst<Token extends BranchToken> = readonly [
    Base.UnknownAst,
    Token,
    Base.UnknownAst
]

export abstract class BranchingNode<
    Token extends BranchToken
> extends NonTerminalNode<Token> {
    constructor(children: Base.node[]) {
        super(children)
    }

    addChild(node: Base.node) {
        this.children.push(node)
    }

    toAst() {
        let ast = this.children[0].toAst()
        for (let i = 1; i < this.children.length; i++) {
            ast = [ast, this.token, this.children[i].toAst()]
        }
        return ast as BinaryAst<Token>
    }

    toString() {
        let result = this.children[0].toString()
        for (let i = 1; i < this.children.length; i++) {
            result += this.token + this.children[i].toString()
        }
        return result
    }

    toIsomorphicDef() {
        let stringifiable = true
        const isomorphizedChildren = this.children.map((child) => {
            const def = child.toIsomorphicDef()
            if (typeof def !== "string") {
                stringifiable = false
            }
            return def
        })
        if (stringifiable) {
            return isomorphizedChildren.join(this.token)
        }
        let root = isomorphizedChildren[0]
        for (let i = 1; i < isomorphizedChildren.length; i++) {
            root = [root, this.token, isomorphizedChildren]
        }
        return root
    }
}
