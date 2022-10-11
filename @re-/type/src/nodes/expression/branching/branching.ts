import { Base } from "../../common.js"
import type { Intersection } from "./intersection.js"
import type { Union } from "./union.js"

export namespace Branching {
    export type Token = Union.Token | Intersection.Token

    type RootString<Token extends Branching.Token> =
        `${string}${Token}${string}`

    type RootTuple<Token extends Branching.Token> = [unknown, Token, unknown]

    const includesStructured = (children: Base.Node[]) =>
        children.some((child) => child.hasStructure)

    export abstract class Node<
        Token extends Branching.Token
    > extends Base.Node {
        abstract token: Token

        constructor(children: Base.Node[]) {
            super(children, includesStructured(children))
        }

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
