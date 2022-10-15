import { Base } from "../../base.js"

export namespace Branching {
    export type Token = "|" | "&"

    const tokenConjunctions = {
        "|": "or",
        "&": "and"
    } as const

    type TokenConjunctions = typeof tokenConjunctions

    export abstract class Node<
        Token extends Branching.Token
    > extends Base.Node {
        abstract token: Token
        definitionRequiresStructure: boolean

        constructor(public children: Base.Node[]) {
            super()
            this.definitionRequiresStructure = children.some(
                (child) => child.definitionRequiresStructure
            )
        }

        pushChild(child: Base.Node) {
            this.children.push(child)
            this.definitionRequiresStructure ||=
                child.definitionRequiresStructure
        }

        toString() {
            return this.mapChildren("toString").join(this.token)
        }

        toBinaryTuple(...branches: unknown[]) {
            let root = branches[0]
            for (let i = 1; i < branches.length; i++) {
                root = [root, this.token, branches[i]]
            }
            return root as readonly [unknown, Token, unknown]
        }

        get definition() {
            return this.definitionRequiresStructure
                ? this.toBinaryTuple(this.mapChildren("definition"))
                : this.toString()
        }

        get mustBe() {
            return this.mapChildren("mustBe").join(
                ` ${tokenConjunctions[this.token]} `
            )
        }

        mapChildren<prop extends keyof Base.Node>(prop: prop) {
            return this.children.map((child) => child[prop])
        }
    }
}
