import { keySet } from "@re-/tools"
import type { Base } from "../../base.js"
import { NonTerminal } from "../nonTerminal.js"
import type { Arr } from "./array.js"
import type { Optional } from "./optional.js"

export namespace Postfix {
    export const tokens = keySet({
        "[]": 1,
        "?": 1
    })

    export type Token = keyof typeof tokens

    export abstract class Node<
        Token extends Postfix.Token
    > extends NonTerminal.Node {
        abstract token: Token

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
            const nextDef = this.child.toIsomorphicDef()
            return typeof nextDef === "string"
                ? `${nextDef}${this.token}`
                : [nextDef, this.token]
        }
    }
}
