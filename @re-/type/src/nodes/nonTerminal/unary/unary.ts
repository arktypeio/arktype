import { keySet } from "@re-/tools"
import type { Base } from "../../base.js"
import type { Check } from "../../traverse/check/check.js"

export namespace Unary {
    export const tokens = keySet({
        "[]": 1,
        "?": 1
    })

    export type Token = keyof typeof tokens

    export abstract class Node<
        Token extends Unary.Token,
        Children extends [Base.Node] = [Base.Node]
    > implements Base.Node
    {
        children: Children
        abstract token: Token

        constructor(protected child: Children[0]) {
            this.children = [child] as Children
        }

        abstract check(state: Check.State): void

        toAst(): [unknown, Token] {
            return [this.child.toAst(), this.token]
        }

        toString() {
            return `${this.child.toString()}${this.token}` as const
        }

        toDefinition() {
            const nextDef = this.child.toDefinition()
            return typeof nextDef === "string"
                ? (`${nextDef}${this.token}` as const)
                : ([nextDef, this.token] as [unknown, Token])
        }
    }
}
