import type { Base } from "../../base.js"
import type { PrimitiveLiteral } from "../../terminal/literal.js"
import type { Check } from "../../traverse/exports.js"
import type { TraversalState } from "../../traverse/traverse.js"
import { Binary } from "./binary.js"

export namespace Divisibility {
    export const token = "%"

    export type Token = typeof token

    export class Node extends Binary.Node<Token> {
        readonly token = token

        constructor(
            private child: Base.node,
            private divisor: PrimitiveLiteral.Node<number>
        ) {
            super([child, divisor])
        }

        check(state: Check.CheckState<number>) {
            if (state.data % this.divisor.value !== 0) {
                const reason =
                    this.divisor.value === 1
                        ? "Must be an integer"
                        : `Must be an integer divisible by ${this.divisor}`
                state.errors.add(
                    "divisibility",
                    {
                        state,
                        reason
                    },
                    { divisor: this.divisor.value, actual: state.data }
                )
            }
        }

        generate(state: TraversalState) {
            this.child.generate(state)
        }
    }

    export type Diagnostic = Check.DiagnosticConfig<{
        divisor: number
        actual: number
    }>
}
