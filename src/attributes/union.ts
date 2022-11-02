import type { Attributes } from "./shared.js"

export const assignUnion = (
    base: Attributes,
    assign: Attributes
): Attributes => {
    return { branches: ["|", base, assign] }
}
