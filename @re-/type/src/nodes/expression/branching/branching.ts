import type { Base } from "../../base.js"
import { addArticle } from "../../base.js"
import { Expression } from "../expression.js"

export namespace Branching {
    export type Token = "|" | "&"

    export type Tuple<Token extends Branching.Token> = [unknown, Token, unknown]

    const tokenConjunctions = {
        "|": "or",
        "&": "and"
    } as const

    type TokenConjunctions = typeof tokenConjunctions

    export abstract class Node<
        Token extends Branching.Token
    > extends Expression.Node<Base.UnknownNode[], Tuple<Token>> {
        abstract token: Token

        pushChild(child: Base.UnknownNode) {
            this.children.push(child)
            this.hasStructure ||= child.hasStructure
        }

        toString() {
            let root = this.children[0].toString()
            for (let i = 1; i < this.children.length; i++) {
                root += this.token + this.children[i].toString()
            }
            return root as `${string}${Token}${string}`
        }

        toTuple(...branches: unknown[]) {
            let root = branches[0]
            for (let i = 1; i < branches.length; i++) {
                root = [root, this.token, branches[i]]
            }
            return root as readonly [unknown, Token, unknown]
        }

        get mustBe() {
            // TODO: Find a better way to do the full description?
            const conjunction = tokenConjunctions[this.token]
            let root = addArticle(this.children[0].mustBe)
            for (let i = 1; i < this.children.length; i++) {
                root += ` ${conjunction} ${addArticle(this.children[i].mustBe)}`
            }
            return root as `${string}${TokenConjunctions[Token]}${string}`
        }
    }
}
