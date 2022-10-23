import { Base } from "../../base/base.js"
import type { Intersection } from "./intersection.js"
import type { Union } from "./union.js"

export namespace Branching {
    export const tokens = {
        "|": 1,
        "&": 1
    }

    export type Token = keyof typeof tokens

    export abstract class Node extends Base.Node {
        abstract token: Token
        abstract traverse(traversal: Base.Traversal): void
        abstract kind: KindName

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

        toBinaryTuple(children: unknown[]) {
            let root = children[0]
            for (let i = 1; i < children.length; i++) {
                root = [root, this.token, children[i]]
            }
            return root as readonly [unknown, this["token"], unknown]
        }

        get ast() {
            return this.toBinaryTuple(this.mapChildren("ast"))
        }

        get definition() {
            return this.definitionRequiresStructure
                ? this.toBinaryTuple(this.mapChildren("definition"))
                : this.toString()
        }

        get description() {
            return this.mapChildren("description").join(
                ` ${this.token === "|" ? "or" : "and"} `
            )
        }

        protected mapChildren<prop extends keyof Base.Node>(prop: prop) {
            return this.children.map((child) => child[prop])
        }
    }

    export type Kinds = {
        union: Union.Node
        intersection: Intersection.Node
    }

    export type KindName = keyof Kinds
}
