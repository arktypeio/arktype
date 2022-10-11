import { Base } from "../../common.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { Bound } from "./bound.js"
import type { Divisibility } from "./divisibility.js"

export namespace Constraining {
    export type Token = Bound.Token | Divisibility.Token

    // TODO: Better way to do this?
    export type LeftTypedAst = Bound.RightAst | Divisibility.Ast

    export type RightTypedAst = Bound.LeftAst

    export abstract class RightNode<
        Child extends Base.Node,
        Token,
        ValueLiteral extends PrimitiveLiteral.Number
    > extends Base.Node {
        protected valueLiteral: ValueLiteral

        constructor(
            protected child: Child,
            protected token: Token,
            protected value: number
        ) {
            super([child], child.hasStructure)
            this.valueLiteral = String(value) as ValueLiteral
        }

        toString() {
            return `${this.child.toString()}${this.token}${this.value}` as const
        }

        toAst() {
            return [this.child.toAst(), this.token, this.valueLiteral] as const
        }

        toDefinition() {
            return this.hasStructure
                ? ([
                      this.child.toDefinition(),
                      this.token,
                      this.valueLiteral
                  ] as const)
                : this.toString()
        }
    }

    export abstract class LeftNode<
        ValueLiteral extends PrimitiveLiteral.Number,
        Token,
        Child extends Base.Node
    > extends Base.Node {
        protected valueLiteral: ValueLiteral

        constructor(
            protected value: number,
            protected token: Token,
            protected child: Child
        ) {
            super([child], child.hasStructure)
            this.valueLiteral = String(value) as ValueLiteral
        }

        toString() {
            return `${this.valueLiteral}${
                this.token
            }${this.child.toString()}` as const
        }

        toAst() {
            return [this.valueLiteral, this.token, this.child.toAst()] as const
        }

        toDefinition() {
            return this.hasStructure
                ? ([
                      this.valueLiteral,
                      this.token,
                      this.child.toDefinition()
                  ] as const)
                : this.toString()
        }
    }
}
