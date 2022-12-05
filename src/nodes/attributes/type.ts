import type { ScopeRoot } from "../../scope.js"
import { checkAttributes } from "../check.js"
import type { Attributes, BaseAttributes } from "../node.js"

export type LiteralValue = string | number | boolean

export const intersectionIfLiteral = (
    l: BaseAttributes,
    r: BaseAttributes,
    scope: ScopeRoot
): Attributes | "never" | undefined => {
    if (l.subtype !== undefined) {
        if (r.subtype !== undefined) {
            return l.subtype === r.subtype ? (l as Attributes) : "never"
        }
        return checkAttributes(l.subtype, r, scope)
            ? (l as Attributes)
            : "never"
    }
    if (r.subtype !== undefined) {
        return checkAttributes(r.subtype, l, scope)
            ? (r as Attributes)
            : "never"
    }
}

export const checkLiteral = (
    data: number | string | boolean | bigint,
    attribute: LiteralValue
) => attribute === (typeof data === "bigint" ? `${data}` : data)
