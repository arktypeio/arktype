import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import { hasObjectType, ObjectTypeName } from "../utils/typeOf.js"
import { boundsIntersection } from "./attributes/bounds.js"
import { childrenIntersection } from "./attributes/children.js"
import { divisorIntersection } from "./attributes/divisor.js"
import { regexIntersection } from "./attributes/regex.js"
import { checkAttributes } from "./check.js"
import { resolveIfName } from "./names.js"
import type {
    AttributeName,
    AttributesOf,
    BaseAttributes,
    BaseAttributeType,
    Node,
    ResolutionNode,
    TypeNameWithAttributes
} from "./node.js"
import { attributeKeysByType } from "./node.js"
import { union } from "./union.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot): Node => {
    const lResolution = resolveIfName(l, scope)
    const rResolution = resolveIfName(r, scope)
    const result = hasObjectType(lResolution, "Array")
        ? branchesIntersection(lResolution, listFrom(rResolution), scope)
        : hasObjectType(rResolution, "Array")
        ? branchesIntersection([lResolution], rResolution, scope)
        : attributesIntersection(lResolution, rResolution, scope)
    // If the intersection result is identical to one of its operands,
    // return the original operand either as a name or resolution
    // TODO: Avoid the deep equals check by not returning a different
    // object if there is a subtype
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
                result = union(result, branchResult, scope)
            }
        }
    }
    return result
}

export type KeyIntersection<t> = (
    l: t,
    r: t,
    scope: ScopeRoot
) => {
    intersection: t
    subtypes: SubtypesResult
} | null

type SubtypesResult = "" | "l" | "r" | "lr"

type UnknownIntersection = KeyIntersection<any>

const subtypeIntersection: KeyIntersection<BaseAttributeType<"subtype">> = (
    l,
    r
) => (l === r ? { intersection: l, subtypes: "lr" } : null)

const keyIntersections: {
    [k in AttributeName]: KeyIntersection<BaseAttributeType<k>>
} = {
    bounds: boundsIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection,
    children: childrenIntersection,
    subtype: subtypeIntersection
}

export const attributesIntersection = (
    typeName: TypeNameWithAttributes,
    l: BaseAttributes,
    r: BaseAttributes,
    scope: ScopeRoot
): BaseAttributes | "never" => {
    let lIsSubtype = true
    let rIsSubtype = true
    const result: mutable<BaseAttributes> = {}
    for (const k of attributeKeysByType[typeName]) {
        if (l[k]) {
            if (r[k]) {
                const keyResult = (keyIntersections[k] as UnknownIntersection)(
                    l[k],
                    r[k],
                    scope
                )
                if (keyResult === null) {
                    return "never"
                }
                result[k] = keyResult.intersection
                lIsSubtype &&=
                    keyResult.subtypes === "l" || keyResult.subtypes === "lr"
                rIsSubtype &&=
                    keyResult.subtypes === "r" || keyResult.subtypes === "lr"
            }
        }
    }
    return lIsSubtype ? r : rIsSubtype ? l : result
}
