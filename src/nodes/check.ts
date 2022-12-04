import type { ScopeRoot } from "../scope.js"
import { hasObjectSubtype } from "../utils/typeOf.js"
import { checkAttributes } from "./attributes/check.js"
import { resolveIfName } from "./names.js"
import type { Node } from "./node.js"

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
