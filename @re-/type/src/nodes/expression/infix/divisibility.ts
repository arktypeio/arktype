import { hasJsType } from "@re-/tools"
import { Base } from "../../common.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { Check } from "../../traverse/check.js"

export namespace Divisibility {
    export type Token = "%"

    export type Ast = [unknown, Token, PrimitiveLiteral.Number]

    export class Node extends Base.Node {
        allows(state: Check.State<number>) {
            const divisor = this.right.value
            if (hasJsType(state.data, "number") && state.data % divisor !== 0) {
                state.addError("divisibility", {
                    type: this,
                    message:
                        divisor === 1
                            ? "Must be an integer"
                            : `Must be an integer divisible by ${divisor}`,
                    divisor
                })
            }
            this.child.allows(state)
        }

        toDescription() {
            return `${this.child.toDescription()} divisible by ${
                this.right.value
            }`
        }
    }

    export type Diagnostic = Check.ConfigureDiagnostic<
        Node,
        {
            divisor: number
        }
    >
}
