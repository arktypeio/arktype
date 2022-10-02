import { keySet } from "@re-/tools"
import type { Base } from "../base.js"
import type { Check } from "../traverse/check/check.js"

export namespace Expression {
    export const tokens = {
        ...Unary.tokens,
        ...Nary.tokens,
        ...Binary.tokens
    }

    export type Token = Unary.Token | InfixToken

    export type InfixToken = Nary.Token | Binary.Token

    export abstract class Node<
        Children extends Base.Node[],
        Tokens extends Token | Token[]
    > {
        constructor(public children: Children, public tokens: Tokens) {}

        abstract check(state: Check.State): void

        toString() {
            let result = ""
            let i = 0
            for (; i < this.tokens.length; i++) {
                result += this.children[i].toString() + this.tokens[i]
            }
            if (this.children[i]) {
                // There will be one final child if it is an infix expression
                result += this.children[i].toString()
            }
            return result
        }

        toAst() {
            const result: unknown[] = []
            let i = 0
            for (; i < this.tokens.length; i++) {
                result.push(this.children[i].toAst(), this.tokens[i])
            }
            if (this.children[i]) {
                result.push(this.children[i].toAst())
            }
            return result
        }

        /**
         * This generates an isomorphic definition that can be parsed and
         * inverted. The preferred isomorphic format for expressions is the
         * string form over the tuple form:
         *
         * Terminal => string
         * Structural => object
         * NonTerminal => Any structural descendants ? [tuple-form expression] : "string-form expression"
         *
         * For example, the input definitions...
         *
         *     "string|number" (string form)
         *         and
         *     ["string", "|", "number"] (tuple form)
         *
         * both result in a toDefinition() output of "string|number".
         *
         * However, if the input definition was:
         *
         *     [{ a: ["string", "?"] }, "&", { b: ["boolean", "?"] }]
         *
         * Since the structural (in this case object literal) definitions cannot
         * be stringified as a defininition, toDefintion() would yield:
         *
         *     [{a: "string?"}, "&", {b: "boolean?"}]
         */
        toDefinition() {
            const isomorphicChildren: unknown[] = []
            let stringifiable = true
            let i = 0
            for (; i < this.tokens.length; i++) {
                const isomorphicChild = this.children[i].toDefinition()
                if (typeof isomorphicChild !== "string") {
                    stringifiable = false
                }
                isomorphicChildren.push(isomorphicChild, this.tokens[i])
            }
            if (this.children[i]) {
                isomorphicChildren.push(this.children[i].toAst())
            }
            return stringifiable
                ? isomorphicChildren.join("")
                : isomorphicChildren
            // let stringifiable = true
            // const isomorphicChildren = this.children.map((child) => {
            //     const isomorphicChild = child.toDefinition()
            //     if (typeof isomorphicChild !== "string") {
            //         stringifiable = false
            //     }
            //     return isomorphicChild
            // })

            // return stringifiable
            //     ? this.buildString(isomorphicChildren as any)
            //     : this.buildAst(isomorphicChildren as any)
        }
    }
}

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

export namespace Nary {
    export const tokens = keySet({
        "|": 1,
        "&": 1
    })

    export type Token = keyof typeof tokens

    type RootAst = [unknown, Token, unknown]

    export abstract class Node<Token extends Nary.Token> implements Base.Node {
        abstract token: Token

        constructor(public children: Base.Node[]) {}

        abstract check(state: Check.State): void

        pushChild(child: Base.Node) {
            this.children.push(child)
        }

        toAst() {
            let root = this.children[0].toAst()
            for (let i = 1; i < this.children.length; i++) {
                root = [root, this.token, this.children[i].toAst()]
            }
            return root as RootAst
        }

        toString() {
            let root = this.children[0].toString()
            for (let i = 1; i < this.children.length; i++) {
                root = root + this.token + this.children[i].toString()
            }
            return root
        }

        toDefinition() {
            let stringifiable = true
            const nextDefs = this.children.map((child) => {
                const def = child.toDefinition()
                if (typeof def !== "string") {
                    stringifiable = false
                }
                return def
            })
            if (stringifiable) {
                return nextDefs.join(this.token)
            }
            let root = nextDefs[0]
            for (let i = 1; i < nextDefs.length; i++) {
                root = [root, this.token, nextDefs]
            }
            return root as RootAst
        }
    }
}
