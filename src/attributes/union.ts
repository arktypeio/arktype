import type { DynamicParserContext } from "../parser/common.js"
import type { Attributes } from "./shared.js"

export const assignUnion = (
    base: Attributes,
    assign: Attributes,
    context: DynamicParserContext
): Attributes => {
    return { branches: ["|", base, assign] }
}
