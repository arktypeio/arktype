import type { UnaryToken } from "../../parser/common.js"
import type { Base } from "../base.js"
import type { ConstraintToggles } from "../constraints/constraint.js"
import { NonTerminalNode } from "./nonTerminal.js"

export abstract class UnaryNode<
    Token extends UnaryToken,
    AllowedConstraints extends ConstraintToggles = {}
> extends NonTerminalNode<Token, AllowedConstraints> {
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
