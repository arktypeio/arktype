import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import { listFrom } from "../utils/generics.js"
import { hasType } from "../utils/typeOf.js"
import { resolveIfName } from "./names.js"
import type { AttributesNode, BranchesNode, Node } from "./node.js"
import type { ObjectAttributes } from "./object/attributes.js"
import { objectIntersection } from "./object/intersection.js"
import type { PrimitiveAttributes } from "./primitive/attributes.js"
import { primitiveIntersection } from "./primitive/intersection.js"
import { union } from "./union.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot): Node => {
    const lResolution = resolveIfName(l, scope)
    const rResolution = resolveIfName(r, scope)
    const result = hasType(lResolution, "object", "array")
        ? branchesIntersection(lResolution, listFrom(rResolution), scope)
        : hasType(rResolution, "object", "array")
        ? branchesIntersection([lResolution], rResolution, scope)
        : attributesIntersection(lResolution, rResolution, scope)
    // If the intersection result is identical to one of its operands,
    // return the original operand either as a name or resolution
    if (deepEquals(result, lResolution)) {
        return l
    }
    if (deepEquals(result, rResolution)) {
        return r
    }
    return result
}

const branchesIntersection = (
    l: BranchesNode,
    r: BranchesNode,
    scope: ScopeRoot
) => {
    let result: Node = "never"
    for (const lBranch of l) {
        for (const rBranch of r) {
            const branchResult = intersection(lBranch, rBranch, scope)
            if (branchResult !== "never") {
                result = union(result, listFrom(branchResult), scope)
            }
        }
    }
    return result
}

const attributesIntersection = (
    l: AttributesNode,
    r: AttributesNode,
    scope: ScopeRoot
): Node =>
    l.type !== r.type
        ? "never"
        : l.type === "object"
        ? objectIntersection(l, r as ObjectAttributes, scope)
        : primitiveIntersection(l, r as PrimitiveAttributes)
