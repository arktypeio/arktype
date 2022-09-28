import type { UnaryToken } from "../../parser/common.js"
import type { Base } from "../base.js"
import { NonTerminalNode } from "./nonTerminal.js"

export abstract class UnaryNode<
    Token extends UnaryToken
> extends NonTerminalNode<Token> {
    constructor(protected child: Base.node) {
        super([child])
    }

    toAst() {
        return [this.child.toAst(), this.token] as const
    }

    toString() {
        return this.child.toString() + this.token
    }

    toIsomorphicDef() {
        const childDef = this.child.toIsomorphicDef()
        return typeof childDef === "string"
            ? `${childDef}${this.token}`
            : [childDef, this.token]
    }
}
