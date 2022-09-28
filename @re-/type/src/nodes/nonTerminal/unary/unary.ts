import type { Base } from "../../base.js"
import { NonTerminal } from "../nonTerminal.js"
import type { Array } from "./array.js"
import type { Optional } from "./optional.js"

export namespace Unary {
    export type Token = Array.Token | Optional.Token

    export abstract class Node<T extends Token> extends NonTerminal.Node<T> {
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
}
