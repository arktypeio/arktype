import { keySet } from "@re-/tools"
import type { Base } from "../../common.js"
import type { Check } from "../../traverse/check.js"
import { Bound } from "./bound.js"

export namespace Infix {
    export const tokens = keySet({
        ...Bound.tokens,
        "%": 1
    })

    export type Token = keyof typeof tokens

    /** These tokens affect runtime validation but not the inferred type */
    export type TypelessToken = Token

    type RootString<
        Left extends Base.Node,
        Token extends Infix.Token,
        Right extends Base.Node
    > = `${ReturnType<Left["toString"]>}${Token}${ReturnType<
        Right["toString"]
    >}`

    type RootTupleDefinition<
        Left extends Base.Node,
        Token extends Infix.Token,
        Right extends Base.Node
    > = [
        ReturnType<Left["toDefinition"]>,
        Token,
        ReturnType<Right["toDefinition"]>
    ]

    type RootAst<
        Left extends Base.Node,
        Token extends Infix.Token,
        Right extends Base.Node
    > = [ReturnType<Left["toAst"]>, Token, ReturnType<Right["toAst"]>]

    export abstract class Node<
        Left extends Base.Node,
        Token extends Infix.Token,
        Right extends Base.Node
    > implements Base.Node
    {
        hasStructure: boolean

        constructor(
            protected left: Left,
            protected token: Token,
            protected right: Right
        ) {
            this.hasStructure =
                this.left.hasStructure || this.right.hasStructure
        }

        abstract check(state: Check.State): void

        toString() {
            return `${this.left.toString()}${
                this.token
            }${this.right.toString()}` as RootString<Left, Token, Right>
        }

        toAst() {
            return [
                this.left.toAst(),
                this.token,
                this.right.toAst()
            ] as RootAst<Left, Token, Right>
        }

        toDefinition() {
            return this.hasStructure
                ? ([
                      this.left.toDefinition(),
                      this.token,
                      this.right.toDefinition()
                  ] as RootTupleDefinition<Left, Token, Right>)
                : this.toString()
        }
    }
}
