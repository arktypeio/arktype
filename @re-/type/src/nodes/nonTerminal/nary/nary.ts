import { keySet } from "@re-/tools"
import type { Base } from "../../base.js"
import type { Check } from "../../traverse/check/check.js"

export namespace Nary {
    export const tokens = keySet({
        "|": 1,
        "&": 1
    })

    export type Token = keyof typeof tokens

    type RootAst = [unknown, Token, unknown]

    export abstract class Node<Token extends Nary.Token> implements Base.Node {
        abstract token: Token

        constructor(public children: Base.Node[]) {}

        abstract check(state: Check.State): void

        pushChild(child: Base.Node) {
            this.children.push(child)
        }

        toAst() {
            let root = this.children[0].toAst()
            for (let i = 1; i < this.children.length; i++) {
                root = [root, this.token, this.children[i].toAst()]
            }
            return root as RootAst
        }

        toString() {
            let root = this.children[0].toString()
            for (let i = 1; i < this.children.length; i++) {
                root = root + this.token + this.children[i].toString()
            }
            return root
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
            return root as RootAst
        }
    }
}
