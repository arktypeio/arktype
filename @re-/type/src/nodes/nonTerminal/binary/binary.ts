import { keySet } from "@re-/tools"
import type { Base } from "../../base.js"
import { NonTerminal } from "../nonTerminal.js"

export namespace Binary {
    export const tokens = keySet({
        ">": 1,
        "<": 1,
        ">=": 1,
        "<=": 1,
        "==": 1,
        "%": 1
    })

    export type Token = keyof typeof tokens

    export type Children = [Base.node, Base.node]

    export abstract class Node<
        Token extends Binary.Token,
        Children extends Binary.Children = Binary.Children
    > extends NonTerminal.Node<Children> {
        abstract token: Token

        toIsomorphicDef() {
            const leftIsomorph = this.children[0].toIsomorphicDef()
            const rightIsomorph = this.children[1].toIsomorphicDef()
            return typeof leftIsomorph === "string" &&
                typeof rightIsomorph === "string"
                ? leftIsomorph + this.token + rightIsomorph
                : [leftIsomorph, this.token, rightIsomorph]
        }

        toString() {
            return (
                this.children[0].toString() +
                this.token +
                this.children[1].toString()
            )
        }

        toAst() {
            return [
                this.children[0].toAst(),
                this.token,
                this.children[0].toAst()
            ]
        }
    }
}
