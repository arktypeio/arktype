import type { DynamicParserContext } from "../parser/common.js"
import type { Attributes } from "./shared.js"

// TODO: Mutate?
export const assignUnion = (
    base: Attributes,
    assign: Attributes,
    context: DynamicParserContext
): Attributes => {
    if (base.branches?.[0] === "|") {
        return {
            ...base,
            branches: [...base.branches, assign]
        }
    }
    return { branches: ["|", base, assign] }
}
