import type { UnaryToken } from "../../parser/common.js"
import type { Base } from "../base.js"
import { NonTerminalNode } from "./nonTerminal.js"

export abstract class UnaryNode<
    Token extends UnaryToken,
    AllowedConstraint extends string = never
> extends NonTerminalNode<Token, AllowedConstraint> {
    constructor(protected child: Base.node) {
        super([child])
    }

    protected typeAst() {
        return [this.child.ast, this.token] as const
    }

    protected typeStr() {
        return this.child.toString() + this.token
    }

    protected typeDef() {
        const def = this.child.def
        return typeof def === "string"
            ? `${def}${this.token}`
            : [def, this.token]
    }
}
