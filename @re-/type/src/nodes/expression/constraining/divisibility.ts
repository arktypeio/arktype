import type { Base } from "../../common.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { Check } from "../../traverse/check.js"
import { Constraining } from "./constraining.js"

export namespace Divisibility {
    export type Token = "%"

    export type Ast = [unknown, Token, PrimitiveLiteral.Number]

    export class Node extends Constraining.RightNode<
        Base.Node,
        Token,
        PrimitiveLiteral.Integer
    > {
        allows(state: Check.State<number>) {
            this.child.allows(state)
            if (state.data % this.value !== 0) {
            }
        }

        toDescription() {
            return `${this.child.toDescription()} divisible by ${this.value}`
        }
    }

    export type Diagnostic = Check.ConfigureDiagnostic<
        Node,
        {
            divisor: number
        }
    >
}
