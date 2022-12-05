import type { ScopeRoot } from "../scope.js"
import { hasObjectSubtype } from "../utils/typeOf.js"
import { resolveIfName } from "./names.js"
import type { Node } from "./node.js"
import { checkObject } from "./object/intersection.js"
import { checkPrimitive } from "./primitive/check.js"

export const checkNode = (
    data: unknown,
    attributes: Node,
    scope: ScopeRoot
): boolean => {
    const resolution = resolveIfName(attributes, scope)
    return hasObjectSubtype(resolution, "array")
        ? resolution.some((branch) => checkNode(data, branch, scope))
        : resolution.type === "object"
        ? checkObject(data, resolution, scope)
        : checkPrimitive(data, resolution)
}
