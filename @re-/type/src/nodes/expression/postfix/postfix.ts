import type { Base } from "../../common.js"
import type { Check } from "../../traverse/check.js"
import type { Arr } from "./array.js"
import type { Optional } from "./optional.js"

export namespace Postfix {
    export type Token = Optional.Token | Arr.Token

    type RootString<
        Child extends Base.Node,
        Token extends Postfix.Token
    > = `${ReturnType<Child["toString"]>}${Token}`

    type RootAst<Child extends Base.Node, Token extends Postfix.Token> = [
        ReturnType<Child["toAst"]>,
        Token
    ]

    type RootTupleDefinition<
        Child extends Base.Node,
        Token extends Postfix.Token
    > = [ReturnType<Child["toDefinition"]>, Token]

    export abstract class Node<
        Token extends Postfix.Token,
        Child extends Base.Node = Base.Node
    > implements Base.Node
    {
        hasStructure: boolean
        abstract token: Token

        constructor(protected child: Child) {
            this.hasStructure = this.child.hasStructure
        }

        abstract check(state: Check.State): void

        toString() {
            return `${this.child.toString()}${this.token}` as RootString<
                Child,
                Token
            >
        }

        toAst() {
            return [this.child.toAst() as any, this.token] as RootAst<
                Child,
                Token
            >
        }

        toDefinition() {
            return this.hasStructure
                ? ([
                      this.child.toDefinition(),
                      this.token
                  ] as RootTupleDefinition<Child, Token>)
                : this.toString()
        }
    }
}
