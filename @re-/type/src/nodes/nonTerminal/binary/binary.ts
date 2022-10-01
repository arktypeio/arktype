import { keySet } from "@re-/tools"
import type { Base } from "../../base.js"
import type { Check } from "../../traverse/check/check.js"

export namespace Binary {
    export const tokens = keySet({
        ">": 1,
        "<": 1,
        ">=": 1,
        "<=": 1,
        "==": 1,
        "%": 1
    })

    export type Token = keyof typeof tokens

    export type Children = [Base.Node, Base.Node]

    export abstract class Node<
        Token extends Binary.Token,
        Children extends Binary.Children = Binary.Children
    > implements Base.Node
    {
        abstract token: Token

        constructor(public children: Children) {}

        abstract check(state: Check.State): void

        toAst(): [unknown, Token, unknown] {
            return [
                this.children[0].toAst(),
                this.token,
                this.children[1].toAst()
            ]
        }

        toString() {
            return `${this.children[0].toString()}${
                this.token
            }${this.children[1].toString()}` as const
        }

        toDefinition() {
            const leftDefinition = this.children[0].toDefinition()
            const rightDefinition = this.children[1].toDefinition()
            return typeof leftDefinition === "string" &&
                typeof rightDefinition === "string"
                ? (`${leftDefinition}${this.token}${rightDefinition}` as const)
                : ([leftDefinition, this.token, rightDefinition] as [
                      unknown,
                      Token,
                      unknown
                  ])
        }
    }
}
