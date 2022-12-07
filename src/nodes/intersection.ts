import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { Dictionary, mutable, NonNullish } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import { hasObjectType, hasType, Primitive } from "../utils/typeOf.js"
import { resolveIfName } from "./names.js"
import type { BaseResolutionBranch, Node } from "./node.js"
import { ResolutionNode } from "./node.js"
import { union } from "./union.js"

export const intersection: IntersectionReducer<Node> = (l, r, scope) => {
    const lResolution = resolveIfName(l, scope)
    const rResolution = resolveIfName(r, scope)
    const resolution = {
        ...lResolution,
        ...rResolution
    }
    let lImpliesR = true
    let rImpliesL = true
    let k: TypeName
    for (k in resolution) {
        if (k in lResolution) {
            if (k in rResolution) {
                if (lResolution[k] === true) {
                    return r
                }
                resolution[typeName] = {}
            }
        }
    }
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

const resolutionBranchIntersection: IntersectionReducer<
    BaseResolutionBranch,
    { typeName: TypeName; scope: ScopeRoot }
> = (l, r, context) => {
    if (l === true) {
        return r === true ? undefined : r
    }
    if (r === true) {
        return l
    }
    let result: Node = "never"
    for (const lBranch of listFrom(l)) {
        for (const rBranch of listFrom(r)) {
            const lResolution =
                typeof lBranch === "string"
                    ? // TODO: error on empty
                      context.scope.resolve(lBranch)[context.typeName]
                    : lBranch
            const rResolution =
                typeof rBranch === "string"
                    ? context.scope.resolve(rBranch)[context.typeName]
                    : rBranch
            const branchResult = context.typeName === "object"
            if (branchResult !== "never") {
                result = union(result, branchResult, scope)
            }
        }
    }
    return result
}

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

export type ComposeKeyIntersectionOptions = {
    branching?: true
}

export const composeKeyedIntersection =
    <root extends IntersectableRoot, context = ScopeRoot>(
        reducer: RootIntersectionReducer<root, context>,
        options?: ComposeKeyIntersectionOptions
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
                } else if (options?.branching) {
                    lImpliesR = false
                } else {
                    result[k] = l[k]
                    rImpliesL = false
                }
            } else if (options?.branching) {
                rImpliesL = false
            } else {
                result[k] = r[k]
                lImpliesR = false
            }
        }
        return lImpliesR ? (rImpliesL ? undefined : l) : rImpliesL ? r : result
    }
