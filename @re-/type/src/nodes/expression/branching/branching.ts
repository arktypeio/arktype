import { keySet } from "@re-/tools"
import type { Base } from "../../common.js"
import type { Check } from "../../traverse/check.js"

export namespace Branching {
    export const tokens = keySet({
        "|": 1,
        "&": 1
    })

    export type Token = keyof typeof tokens

    type RootString<Token extends Branching.Token> =
        `${string}${Token}${string}`

    type RootTuple<Token extends Branching.Token> = [unknown, Token, unknown]

    export abstract class Node<Token extends Branching.Token>
        implements Base.Node
    {
        abstract token: Token
        hasStructure: boolean

        constructor(public children: Base.Node[]) {
            this.hasStructure = children.some((child) => child.hasStructure)
        }

        abstract check(state: Check.State): void

        pushChild(child: Base.Node) {
            this.children.push(child)
            this.hasStructure ||= child.hasStructure
        }

        toString() {
            let root = this.children[0].toString()
            for (let i = 1; i < this.children.length; i++) {
                root = root + this.token + this.children[i].toString()
            }
            return root as RootString<Token>
        }

        toAst() {
            let root = this.children[0].toAst()
            for (let i = 1; i < this.children.length; i++) {
                root = [root, this.token, this.children[i].toAst()]
            }
            return root as RootTuple<Token>
        }

        toDefinition() {
            if (!this.hasStructure) {
                return this.toString()
            }
            let root = this.children[0].toDefinition()
            for (let i = 1; i < this.children.length; i++) {
                root = [root, this.token, this.children[i].toDefinition()]
            }
            return root as RootTuple<Token>
        }
    }
}
