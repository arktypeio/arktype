import type { ScopeRoot } from "../scope.js"
import { hasObjectType, hasType } from "../utils/typeOf.js"
import type { BaseAttributes } from "./node.js"

export type AttributeChecker<data, k extends keyof BaseAttributes> = (
    data: data,
    attribute: BaseAttributes[k]
) => boolean

export const checkAttributes = (
    data: unknown,
    attributes: BaseAttributes,
    scope: ScopeRoot
) => {
    if (!hasType(data, attributes.type)) {
        return false
    }
    if (attributes.children) {
        return checkChildren(data as object, attributes.children, scope)
    }
    return true
}
