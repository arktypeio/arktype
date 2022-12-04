import type { ScopeRoot } from "../scope.js"
import { hasObjectSubtype, hasType } from "../utils/typeOf.js"
import { resolveIfName } from "./names.js"
import type { BaseAttributes, Node } from "./node.js"

export const checkNode = (
    data: unknown,
    attributes: Node,
    scope: ScopeRoot
): boolean => {
    const resolution = resolveIfName(attributes, scope)
    return hasObjectSubtype(resolution, "array")
        ? resolution.some((branch) => checkNode(data, branch, scope))
        : checkAttributes(data, resolution, scope)
}

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
