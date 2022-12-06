import type { ScopeRoot } from "../scope.js"
import { hasObjectType, hasType } from "../utils/typeOf.js"
import { checkChildren } from "./attributes/props.js"
import { resolveIfName } from "./names.js"
import type {
    AttributeName,
    BaseAttributes,
    BaseAttributeType,
    Node
} from "./node.js"

export const checkNode = (
    data: unknown,
    attributes: Node,
    scope: ScopeRoot
): boolean => {
    const resolution = resolveIfName(attributes, scope)
    return hasObjectType(resolution, "Array")
        ? resolution.some((branch) => checkNode(data, branch, scope))
        : checkAttributes(data, resolution, scope)
}

export type AttributeChecker<data, k extends AttributeName> = (
    data: data,
    attribute: BaseAttributeType<k>
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
