import type { Base } from "../../common.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { Check } from "../../traverse/check.js"
import { Infix } from "./infix.js"

export namespace Divisibility {
    export const token = "%"

    export type Token = typeof token

    export type Ast = [unknown, Token, PrimitiveLiteral.Number]

    export class Node extends Infix.Node<
        Base.Node,
        Token,
        PrimitiveLiteral.Node<number>
    > {
        check(state: Check.State<number>) {
            const divisor = this.right.value
            if (state.data % divisor !== 0) {
                state.addError("divisibility", {
                    type: this,
                    message:
                        divisor === 1
                            ? "Must be an integer"
                            : `Must be an integer divisible by ${divisor}`,
                    divisor
                })
            }
        }
    }

    export type Diagnostic = Check.ConfigureDiagnostic<
        Node,
        {
            divisor: number
        }
    >
}
