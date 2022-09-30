import { keySet } from "@re-/tools"
import type { Base } from "../../base.js"
import { NonTerminal } from "../nonTerminal.js"

export namespace Nary {
    export const tokens = keySet({
        "|": 1,
        "&": 1
    })

    export type Token = keyof typeof tokens

    export abstract class Node<
        Token extends Nary.Token
    > extends NonTerminal.Node {
        abstract token: Token

        pushChild(child: Base.node) {
            this.children.push(child)
        }

        toDefinition() {
            let stringifiable = true
            const nextDefs = this.children.map((child) => {
                const def = child.toDefinition()
                if (typeof def !== "string") {
                    stringifiable = false
                }
                return def
            })
            if (stringifiable) {
                return nextDefs.join(this.token)
            }
            let root = nextDefs[0]
            for (let i = 1; i < nextDefs.length; i++) {
                root = [root, this.token, nextDefs]
            }
            return root
        }

        toString() {
            let root = this.children[0].toString()
            for (let i = 1; i < this.children.length; i++) {
                root = root + this.token + this.children[i].toString()
            }
            return root
        }

        toAst() {
            let root = this.children[0].toAst()
            for (let i = 1; i < this.children.length; i++) {
                root = [root, this.token, this.children[i].toAst()]
            }
            return root
        }
    }
}
