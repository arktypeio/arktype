import { keySet } from "@re-/tools"
import type { Base } from "../base.js"
import type { Check } from "../traverse/check/check.js"

export namespace Expression {
    export const infixTokens = {
        ...Binary.tokens,
        ...Branching.tokens
    }

    export type InfixToken = keyof typeof infixTokens

    export const tokens = {
        ...Postfix.tokens,
        ...infixTokens
    }

    export type Token = keyof typeof tokens
}

export namespace Postfix {
    export const tokens = keySet({
        "[]": 1,
        "?": 1
    })

    export type Token = keyof typeof tokens

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

    type RootString<
        Left extends Base.Node,
        Token extends Binary.Token,
        Right extends Base.Node
    > = `${ReturnType<Left["toString"]>}${Token}${ReturnType<
        Right["toString"]
    >}`

    type RootTupleDefinition<
        Left extends Base.Node,
        Token extends Binary.Token,
        Right extends Base.Node
    > = [
        ReturnType<Left["toDefinition"]>,
        Token,
        ReturnType<Right["toDefinition"]>
    ]

    type RootAst<
        Left extends Base.Node,
        Token extends Binary.Token,
        Right extends Base.Node
    > = [ReturnType<Left["toAst"]>, Token, ReturnType<Right["toAst"]>]

    export abstract class Node<
        Left extends Base.Node,
        Token extends Binary.Token,
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

export namespace Branching {
    export const tokens = keySet({
        "|": 1,
        "&": 1
    })

    export type Token = keyof typeof tokens

    type RootString<Token extends Branching.Token> =
        `${string}${Token}${string}`

    type RootTuple<Token extends Branching.Token> = [unknown, Token, unknown]

    export abstract class Node<Token extends Branching.Token>
        implements Base.Node
    {
        abstract token: Token
        hasStructure: boolean

        constructor(public children: Base.Node[]) {
            this.hasStructure = children.some((child) => child.hasStructure)
        }

        abstract check(state: Check.State): void

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
