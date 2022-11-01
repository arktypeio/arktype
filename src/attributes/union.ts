import type { DynamicParserContext } from "../parser/common.js"
import type { Attributes } from "./shared.js"

export const assignUnion = (
    base: Attributes,
    assign: Attributes,
    context: DynamicParserContext
): Attributes => {
    if (base.branches?.[0] !== "|") {
        return { branches: ["|", base, assign] }
    }
    base.branches.push(assign)
    return base
}
