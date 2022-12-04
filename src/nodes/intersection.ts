import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import { listFrom } from "../utils/generics.js"
import { hasType } from "../utils/typeOf.js"
import { boundsIntersection } from "./attributes/bounds.js"
import { childrenIntersection } from "./attributes/children.js"
import { divisorIntersection } from "./attributes/divisor.js"
import { intersectionIfLiteral } from "./attributes/literal.js"
import { regexIntersection } from "./attributes/regex.js"
import { resolveIfName } from "./names.js"
import type {
    AttributeName,
    Attributes,
    BaseAttributes,
    BaseAttributeType,
    Branches,
    Node
} from "./node.js"
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

const branchesIntersection = (l: Branches, r: Branches, scope: ScopeRoot) => {
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

export type KeyIntersection<t> = (l: t, r: t, scope: ScopeRoot) => t | null

type UnknownIntersection = KeyIntersection<any>

type IntersectedKey = Exclude<AttributeName, "type" | "literal">

const keyIntersections: {
    [k in IntersectedKey]: KeyIntersection<BaseAttributeType<k>>
} = {
    bounds: boundsIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection,
    subtype: (l, r) => (l === r ? l : null),
    children: childrenIntersection
}

export const attributesIntersection = (
    l: BaseAttributes,
    r: BaseAttributes,
    scope: ScopeRoot
): Attributes | "never" => {
    if (l.type !== r.type) {
        return "never"
    }
    const literalResult = intersectionIfLiteral(l, r, scope)
    if (literalResult) {
        return literalResult
    }
    const result = { ...l, ...r }
    let k: AttributeName
    for (k in result) {
        // type and literal have already been handled, so skip those
        if (k !== "type" && k !== "literal" && l[k] && r[k]) {
            const keyResult = (keyIntersections[k] as UnknownIntersection)(
                l[k],
                r[k],
                scope
            )
            if (keyResult === null) {
                return "never"
            }
            result[k] = keyResult
        }
    }
    return result as Attributes
}
