import type { Base } from "../base.js"
import { Keyword } from "../terminal/keyword.js"
import type { PrimitiveLiteral } from "../terminal/primitiveLiteral.js"
import type { Check } from "../traverse/check.js"
import { Expression } from "./expression.js"

export namespace Divisibility {
    export type Token = "%"

    export type Tuple = [unknown, Token, PrimitiveLiteral.Number]

    export class Node extends Expression.Node<[Base.UnknownNode], Tuple> {
        readonly kind = "divisibility"

        constructor(child: Base.UnknownNode, public divisor: number) {
            super([child])
        }

        allows(data: number) {
            if (data % this.divisor !== 0) {
                return
            }
        }

        precondition = Keyword.getNode("number")

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
