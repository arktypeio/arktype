import type { AttributeReducer } from "./shared.js"

export namespace Divisible {
    export const reduce: AttributeReducer<"divisible"> = (base, divisor) => {
        if (base === undefined) {
            return [divisor, { typed: "number" }]
        }
        return base === divisor ? [] : [leastCommonMultiple(base, divisor)]
    }
}
