import type { Base } from "../../base.js"
import { NonTerminal } from "../nonTerminal.js"
import type { Intersection } from "./intersection.js"
import type { Union } from "./union.js"

export namespace Branching {
    export type Token = Union.Token | Intersection.Token

    export type Ast<T extends Token> = readonly [
        Base.UnknownAst,
        T,
        Base.UnknownAst
    ]

    export abstract class Node<T extends Token> extends NonTerminal.Node<T> {
        constructor(children: Base.node[]) {
            super(children)
        }

        addChild(node: Base.node) {
            this.children.push(node)
        }

        toAst() {
            let ast = this.children[0].toAst()
            for (let i = 1; i < this.children.length; i++) {
                ast = [ast, this.token, this.children[i].toAst()]
            }
            return ast as Ast<T>
        }

        toString() {
            let result = this.children[0].toString()
            for (let i = 1; i < this.children.length; i++) {
                result += this.token + this.children[i].toString()
            }
            return result
        }

        toIsomorphicDef() {
            let stringifiable = true
            const isomorphizedChildren = this.children.map((child) => {
                const def = child.toIsomorphicDef()
                if (typeof def !== "string") {
                    stringifiable = false
                }
                return def
            })
            if (stringifiable) {
                return isomorphizedChildren.join(this.token)
            }
            let root = isomorphizedChildren[0]
            for (let i = 1; i < isomorphizedChildren.length; i++) {
                root = [root, this.token, isomorphizedChildren]
            }
            return root
        }
    }
}
