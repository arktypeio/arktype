import { Base } from "../../common.js"
import type { Check } from "../../traverse/check.js"
import type { Bound } from "./bound.js"
import type { Divisibility } from "./divisibility.js"

export namespace Infix {
    export type Token = Bound.Token | Divisibility.Token

    // TODO: Better way to do this?
    export type LeftTypedAst = Bound.RightAst | Divisibility.Ast

    export type RightTypedAst = Bound.LeftAst

    type RootString<
        Left extends Base.Node,
        Token extends string,
        Right extends Base.Node
    > = `${ReturnType<Left["toString"]>}${Token}${ReturnType<
        Right["toString"]
    >}`

    type RootTupleDefinition<
        Left extends Base.Node,
        Token extends string,
        Right extends Base.Node
    > = [
        ReturnType<Left["toDefinition"]>,
        Token,
        ReturnType<Right["toDefinition"]>
    ]

    type RootAst<
        Left extends Base.Node,
        Token extends string,
        Right extends Base.Node
    > = [ReturnType<Left["toAst"]>, Token, ReturnType<Right["toAst"]>]

    export abstract class Node<
        Left extends Base.Node,
        Token extends string,
        Right extends Base.Node
    > extends Base.Node {
        hasStructure: boolean

        constructor(
            protected left: Left,
            protected token: Token,
            protected right: Right
        ) {
            super()
            this.hasStructure =
                this.left.hasStructure || this.right.hasStructure
        }

        abstract allows(state: Check.State): void

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
