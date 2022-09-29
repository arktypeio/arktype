import type { Base } from "../../base.js"
import type { Check } from "../../traverse/exports.js"
import type { Constraining } from "./constraining.js"

export namespace Divisibility {
    export class Constraint implements Constraining.Constraint {
        constructor(private divisor: number) {}

        check(state: Check.CheckState<number>) {
            if (state.data % this.divisor !== 0) {
                const reason =
                    this.divisor === 1
                        ? "Must be an integer"
                        : this.divisor === 2
                        ? "Must be an even integer"
                        : `Must be an integer divisible by ${this.divisor}`
                state.errors.add(
                    "divisibility",
                    {
                        state,
                        reason
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
