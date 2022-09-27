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

    protected typeAst() {
        let ast = this.children[0].ast
        for (let i = 1; i < this.children.length; i++) {
            ast = [ast, this.token, this.children[i].ast]
        }
        return ast as BinaryAst<Token>
    }

    protected typeStr() {
        let result = this.children[0].toString()
        for (let i = 1; i < this.children.length; i++) {
            result += this.token + this.children[i].toString()
        }
        return result
    }

    protected typeDef() {
        let stringifiable = true
        const childDefs = this.children.map((child) => {
            const def = child.def
            if (typeof def !== "string") {
                stringifiable = false
            }
            return def
        })
        if (stringifiable) {
            return childDefs.join(this.token)
        }
        let binaryDef = childDefs[0]
        for (let i = 1; i < childDefs.length; i++) {
            binaryDef = [binaryDef, this.token, childDefs]
        }
        return binaryDef
    }
}
