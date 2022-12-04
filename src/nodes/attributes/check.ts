import type { ScopeRoot } from "../../scope.js"
import { hasType } from "../../utils/typeOf.js"
import type { BaseAttributes } from "./attributes.js"

export const checkAttributes = (
    data: unknown,
    attributes: BaseAttributes,
    scope: ScopeRoot
) => {
    if (!hasType(data, attributes.type)) {
        return false
    }
    return true
}
