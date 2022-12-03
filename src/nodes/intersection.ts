import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import { hasType } from "../utils/typeOf.js"
import { resolveIfName } from "./names.js"
import type { AttributesNode, BranchesNode, Node } from "./node.js"
import type { ObjectAttributes } from "./object/attributes.js"
import { objectIntersection } from "./object/intersection.js"
import type { PrimitiveAttributes } from "./primitive/attributes.js"
import { primitiveIntersection } from "./primitive/intersection.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot): Node => {
    const lResolution = resolveIfName(l, scope)
    const rResolution = resolveIfName(r, scope)
    const result = hasType(lResolution, "object", "array")
        ? branchesIntersection(lResolution, listFrom(rResolution), scope)
        : hasType(rResolution, "object", "array")
        ? branchesIntersection([lResolution], rResolution, scope)
        : attributesIntersection(lResolution, rResolution, scope)
    // If the intersection included a name and its result is identical to the
    // original resolution of that name, return the name instead of its expanded
    // form as the result
    if (typeof l === "string" && deepEquals(result, lResolution)) {
        return l
    }
    if (typeof r === "string" && deepEquals(result, rResolution)) {
        return r
    }
    return result
}

const branchesIntersection = (
    l: BranchesNode,
    r: BranchesNode,
    scope: ScopeRoot
) => {
    const result: mutable<BranchesNode> = []
    for (const lBranch of l) {
        for (const rBranch of r) {
            const branchResult = intersection(lBranch, rBranch, scope)
            for (const branch of listFrom(branchResult)) {
                if (branch !== "never") {
                    // TODO: Avoid pushing subtypes
                    result.push(branch)
                }
            }
        }
    }
    return result.length === 0
        ? "never"
        : result.length === 1
        ? result[0]
        : result
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
