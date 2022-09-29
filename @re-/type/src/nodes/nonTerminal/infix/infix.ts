import { keySet } from "@re-/tools"
import { NonTerminal } from "../nonTerminal.js"

export namespace Infix {
    export const branchingTokens = keySet({
        "|": 1,
        "&": 1
    })

    export type BranchingToken = keyof typeof branchingTokens

    export const constrainingTokens = keySet({
        ">": 1,
        "<": 1,
        ">=": 1,
        "<=": 1,
        "==": 1,
        "%": 1
    })

    export type ConstrainingToken = keyof typeof constrainingTokens

    export const tokens = {
        ...branchingTokens,
        ...constrainingTokens
    }

    export type Token = keyof typeof tokens

    export abstract class Node<
        Token extends Infix.Token
    > extends NonTerminal.Node {
        abstract token: Token

        toIsomorphicDef() {
            let stringifiable = true
            const nextDefs = this.children.map((child) => {
                const def = child.toIsomorphicDef()
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
