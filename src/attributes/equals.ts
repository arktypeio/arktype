import type { AttributeReducer } from "./shared.js"

export namespace Equals {
    export const reduce: AttributeReducer<
        "equals",
        // equalsWasInBase is used to distinguish the literal value undefined
        [value: unknown, equalsWasInBase: boolean]
    > = (base, value, equalsWasInBase) => {
        if (!equalsWasInBase) {
            return [value]
        }
        return base === value ? [] : "never"
    }
}
