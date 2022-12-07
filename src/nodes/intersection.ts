import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type {
    defined,
    Dictionary,
    List,
    mutable,
    stringKeyOf
} from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { Primitive } from "../utils/typeOf.js"
import { hasObjectType } from "../utils/typeOf.js"
import { resolveIfName } from "./names.js"
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

type IntersectableKeyValue = Exclude<Primitive, boolean | undefined> | object

export type IntersectionReducer<t extends IntersectableKeyValue> = (
    l: t,
    r: t,
    scope: ScopeRoot
) => t | boolean

export type KeyIntersectionReducer<key, t extends IntersectableKeyValue> = (
    key: key,
    l: t,
    r: t,
    scope: ScopeRoot
) => t | boolean

export type KeyIntersectionReducerMap<root extends IntersectableRoot> = {
    [k in keyof root]-?: IntersectionReducer<root[k]>
}

export type RootIntersectionReducer<root extends IntersectableRoot> =
    | KeyIntersectionReducerMap<Required<root>>
    | KeyIntersectionReducer<keyof root, root[keyof root]>

export type IntersectableRoot = Dictionary<IntersectableKeyValue>

export const composeKeyedIntersection =
    <root extends IntersectableRoot>(
        reducer: RootIntersectionReducer<root>
    ): IntersectionReducer<root> =>
    (l, r, scope) => {
        const result: mutable<root> = { ...l, ...r }
        let lImpliesR = true
        let rImpliesL = true
        let k: keyof root
        for (k in result) {
            if (k in l) {
                if (k in r) {
                    const keyResult =
                        typeof reducer === "function"
                            ? reducer(k, l[k], r[k], scope)
                            : reducer[k](l[k], r[k], scope)
                    if (keyResult === true) {
                        result[k] = l[k]
                    } else if (keyResult === false) {
                        return false
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
        return lImpliesR ? (rImpliesL ? true : l) : rImpliesL ? r : result
    }
