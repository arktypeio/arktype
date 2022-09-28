import type { Base } from "../../base.js"
import type { Check } from "../../traverse/exports.js"
import type { BaseCondition } from "./constraint.js"

export namespace Divisibility {
    export class Condition implements BaseCondition {
        constructor(private divisor: number) {}

        check(state: Check.CheckState<number>) {
            if (state.data % this.divisor !== 0) {
                state.errors.add(
                    "divisibility",
                    {
                        state,
                        reason: `Must be divisible by ${this.divisor}`
                    },
                    { divisor: this.divisor, actual: state.data }
                )
            }
        }

        affixToAst(conditionsAst: Base.UnknownAst[]) {
            conditionsAst.push(["%", this.divisor])
        }

        affixToString(def: string) {
            return def + "%" + this.divisor
        }
    }

    export type Diagnostic = Check.DiagnosticConfig<{
        divisor: number
        actual: number
    }>
}
