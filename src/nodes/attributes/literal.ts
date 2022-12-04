import type { ScopeRoot } from "../../scope.js"
import type { Attributes, BaseAttributes } from "./attributes.js"
import { checkAttributes } from "./check.js"

export type LiteralValue = string | number | boolean

// Fix bigint to check right value
export const intersectionIfLiteral = (
    l: BaseAttributes,
    r: BaseAttributes,
    scope: ScopeRoot
): Attributes | "never" | undefined => {
    if (l.literal !== undefined) {
        if (r.literal !== undefined) {
            return l.literal === r.literal ? (l as Attributes) : "never"
        }
        return checkAttributes(l.literal, r, scope)
            ? (l as Attributes)
            : "never"
    }
    if (r.literal !== undefined) {
        return checkAttributes(r.literal, l, scope)
            ? (r as Attributes)
            : "never"
    }
}
