import type { Attributes } from "./shared.js"

export const assignUnion = (
    base: Attributes,
    assign: Attributes
): Attributes => {
    if (!base.branches?.["|"]) {
        return { branches: { "|": [base, assign] } }
    }
    base.branches["|"].push(assign)
    return base
}
