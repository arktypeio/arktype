import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type {
    Dictionary,
    mutable,
    NonNullish,
    PartialDictionary
} from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import { hasObjectType, hasType } from "../utils/typeOf.js"
import { boundsIntersection } from "./bounds.js"
import { divisorIntersection } from "./divisor.js"
import { resolveIfName } from "./names.js"
import type { BaseAttributes, BranchNode, Node } from "./node.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"
import { regexIntersection } from "./regex.js"
import { union } from "./union.js"

export const intersection: IntersectionReducer<Node> = (l, r, scope) => {
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

const branchesIntersection = (
    l: BranchNode,
    r: BranchNode,
    scope: ScopeRoot
) => {
    let result: Node = "never"
    let lImpliesR = true
    let rImpliesL = true
    for (const lBranch of l) {
        for (const rBranch of r) {
            const branchResult = intersection(lBranch, rBranch, scope)
            if (branchResult === null) {
                lImpliesR = false
                rImpliesL = false
            } else if (branchResult === undefined) {
                result = union(result, lBranch, scope)
            }
            if (branchResult !== null) {
                if (branchResult === undefined) {
                } else {
                    result = union(result, branchResult, scope)
                }
            }
        }
    }
    return result
}

const mapToTypes = (
    node: Node,
    scope: ScopeRoot,
    result: PartialDictionary<TypeName, BranchNode> = {}
) => {
    const resolution = resolveIfName(node, scope)
    if (hasType(resolution, "object", "Array")) {
        for (const branch of resolution) {
            mapToTypes(branch, scope, result)
        }
    }
}

export const disjointIntersection = (l: string, r: string) =>
    l === r ? undefined : null

export type IntersectionReducer<t extends NonNullish, context = ScopeRoot> = (
    l: t,
    r: t,
    context: context
) => t | null | undefined

export type KeyIntersectionReducerMap<
    root extends IntersectableRoot,
    context
> = {
    [k in keyof root]-?: IntersectionReducer<root[k], context>
}

export type RootIntersectionReducer<root extends IntersectableRoot, context> =
    | KeyIntersectionReducerMap<Required<root>, context>
    | IntersectionReducer<root[keyof root], context>

export type IntersectableRoot = Dictionary<NonNullish>

export const composeKeyedIntersection =
    <root extends IntersectableRoot, context = ScopeRoot>(
        reducer: RootIntersectionReducer<root, context>
    ): IntersectionReducer<root, context> =>
    (l, r, context) => {
        const result: mutable<root> = { ...l, ...r }
        let lImpliesR = true
        let rImpliesL = true
        let k: keyof root
        for (k in result) {
            if (k in l) {
                if (k in r) {
                    const keyResult =
                        typeof reducer === "function"
                            ? reducer(l[k], r[k], context)
                            : reducer[k](l[k], r[k], context)
                    if (keyResult === undefined) {
                        result[k] = l[k]
                    } else if (keyResult === null) {
                        return null
                    } else {
                        result[k] = keyResult
                        lImpliesR &&= keyResult === l[k]
                        rImpliesL &&= keyResult === r[k]
                    }
                } else {
                    result[k] = l[k]
                    rImpliesL = false
                }
            } else {
                result[k] = r[k]
                lImpliesR = false
            }
        }
        return lImpliesR ? (rImpliesL ? undefined : l) : rImpliesL ? r : result
    }

const attributesIntersection = composeKeyedIntersection<BaseAttributes>({
    type: disjointIntersection,
    subtype: disjointIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection,
    props: propsIntersection,
    requiredKeys: requiredKeysIntersection,
    propTypes: propsIntersection,
    bounds: boundsIntersection
})
