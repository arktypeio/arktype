import type { Base } from "../base.js"
import type { PrimitiveLiteral } from "../terminal/primitiveLiteral.js"
import type { Check } from "../traverse/check.js"
import { Expression } from "./expression.js"

export namespace Divisibility {
    export type Token = "%"

    export type Tuple = [unknown, Token, PrimitiveLiteral.Number]

    export class Node extends Expression.Node<[Base.UnknownNode], Tuple> {
        readonly kind = "divisibility"

        constructor(child: Base.UnknownNode, public divisor: number) {
            super([child], child.hasStructure)
        }

        allows(state: Check.State<any>) {
            this.children[0].allows(state)
            // TODO: Fix
            if (state.data % this.divisor !== 0) {
                return
            }
        }

        toString() {
            return `${this.children[0].toString()}%${this.divisor}` as const
        }

        toTuple(child: unknown) {
            return [child, "%", `${this.divisor}`] as const
        }

        get description() {
            return `${this.children[0].description} ${this.checks}`
        }

        get checks() {
            return `divisible by ${this.divisor}` as const
        }
    }

    export type Diagnostic = Check.ConfigureDiagnostic<
        Node,
        {
            divisor: number
        }
    >
}
