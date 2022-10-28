import type { AttributeReducer } from "./shared.js"

export namespace Matches {
    export const reduce: AttributeReducer<"matches", [regexSource: string]> = (
        base,
        expression
    ) => {
        if (!base) {
            return [[expression], { typed: "string" }]
        }
        return [[...base, expression]]
    }
}
