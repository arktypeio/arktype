import type { Base } from "../base.js"
import { Keyword, keywords } from "../terminal/keyword/keyword.js"
import type { NumberLiteral } from "../terminal/primitiveLiteral.js"
import { Expression } from "./expression.js"

export namespace Divisibility {
    export type Token = "%"

    export type Tuple = [unknown, Token, NumberLiteral.Definition]

    export class Node extends Expression.Node<[Base.Node]> {
        readonly kind = "divisibility"

        constructor(child: Base.Node, public divisor: number) {
            super([child])
        }

        precondition = keywords.number

        allows(data: number) {
            if (data % this.divisor !== 0) {
                return false
            }
        }

        toString() {
            return `${this.children[0].toString()}%${this.divisor}` as const
        }

        toTuple(child: unknown) {
            return [child, "%", `${this.divisor}`] as const
        }

        get mustBe() {
            return `divisible by ${this.divisor}` as const
        }
    }
}
