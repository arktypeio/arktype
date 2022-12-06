import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { defined, mutable } from "../utils/generics.js"
import { hasKey, listFrom } from "../utils/generics.js"
import { hasObjectType } from "../utils/typeOf.js"
import { boundsIntersection } from "./attributes/bounds.js"
import { divisorIntersection } from "./attributes/divisor.js"
import { propsIntersection } from "./attributes/props.js"
import { regexIntersection } from "./attributes/regex.js"
import { resolveIfName } from "./names.js"
import type {
    AttributeName,
    BaseAttributes,
    BaseAttributeType,
    Node,
    TypeNameWithAttributes
} from "./node.js"
import { attributeKeysByType } from "./node.js"
import { union } from "./union.js"

export const intersection = (
    l: Node,
    r: Node,
    scope: ScopeRoot
): Node | true => {
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
    return result as Node
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
    context: mutable<BaseAttributes>,
    scope: ScopeRoot
) => t | true | null

type UnknownKeyIntersection = KeyIntersection<
    defined<BaseAttributes[AttributeName]>
>

const subtypeIntersection: KeyIntersection<BaseAttributeType<"subtype">> = (
    l,
    r
) => (l === r ? true : null)

const keyIntersections: {
    [k in AttributeName]: KeyIntersection<BaseAttributeType<k>>
} = {
    bounds: boundsIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection,
    props: propsIntersection,
    propTypes: propsIntersection,
    subtype: subtypeIntersection
}

export const attributesIntersection = (
    typeName: TypeNameWithAttributes,
    l: BaseAttributes,
    r: BaseAttributes,
    scope: ScopeRoot
): BaseAttributes | true | "never" => {
    let lImpliesR = true
    let rImpliesL = true
    const result: mutable<BaseAttributes> = {}
    for (const k of attributeKeysByType[typeName]) {
        if (hasKey(l, k)) {
            if (hasKey(r, k)) {
                const keyResult = (
                    keyIntersections[k] as UnknownKeyIntersection
                )(l[k], r[k], result, scope)
                if (keyResult === null) {
                    return "never"
                }
                if (keyResult === true) {
                    result[k] = l[k] as any
                } else {
                    result[k] = keyResult as any
                    lImpliesR &&= keyResult === l
                    rImpliesL &&= keyResult === r
                }
            } else {
                result[k] = l[k] as any
                rImpliesL = false
            }
        } else if (hasKey(r, k)) {
            result[k] = r[k] as any
            lImpliesR = false
        }
    }
    return lImpliesR ? (rImpliesL ? true : l) : rImpliesL ? r : result
}
