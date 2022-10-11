import type { Base } from "../../common.js"
import { addArticle } from "../../common.js"
import { Expression } from "../expression.js"

export namespace Branching {
    export type Token = "|" | "&"

    const hasStructure = (child: Base.Node) => child.hasStructure

    export type Tuple<Token extends Branching.Token> = [unknown, Token, unknown]

    const tokenConjunctions = {
        "|": "or",
        "&": "and"
    } as const

    type TokenConjunctions = typeof tokenConjunctions

    export abstract class Node<
        Token extends Branching.Token
    > extends Expression.Node<Base.Node[], Tuple<Token>> {
        abstract token: Token

        constructor(children: Base.Node[]) {
            super(children, children.some(hasStructure))
        }

        pushChild(child: Base.Node) {
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

        get description() {
            const conjunction = tokenConjunctions[this.token]
            let root = addArticle(this.children[0].description)
            for (let i = 1; i < this.children.length; i++) {
                root += ` ${conjunction} ${addArticle(
                    this.children[i].description
                )}`
            }
            return root as `${string}${TokenConjunctions[Token]}${string}`
        }
    }
}
