import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import { throwInternalError } from "../utils/errors.js"
import type {
    Dictionary,
    evaluate,
    List,
    mutable,
    NonNullish
} from "../utils/generics.js"
import { hasKey, listFrom, PartialDictionary } from "../utils/generics.js"
import { hasObjectType, hasType } from "../utils/typeOf.js"
import { boundsIntersection } from "./bounds.js"
import { checkAttributes, checkNode } from "./check.js"
import { divisorIntersection } from "./divisor.js"
import { resolveIfName } from "./names.js"
import type {
    BaseAttributes,
    BranchOf,
    NarrowableTypeName,
    Node,
    ResolvedBranchOf
} from "./node.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"
import { regexIntersection } from "./regex.js"
import { union } from "./union.js"

export const intersection: IntersectionReducer<Node> = (l, r, scope) => {
    const lResolution = resolveIfName(l, scope)
    const rResolution = resolveIfName(r, scope)
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
    | IntersectionReducer<Required<root>[keyof root], context>

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

const attributesIntersection = composeKeyedIntersection<BaseAttributes>({
    subtype: disjointIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection,
    props: propsIntersection,
    requiredKeys: requiredKeysIntersection,
    propTypes: propsIntersection,
    bounds: boundsIntersection
})

const typeIntersection = composeKeyedIntersection<Node>((l, r, scope) => {
    if (l === true) {
        return r === true ? undefined : r
    }
    if (r === true) {
        return l
    }

    // TODO: Fix types
    const lBranches = listFrom(l) as List<Dictionary>
    const rBranches = listFrom(r) as List<Dictionary>
    const result: Dictionary[] = []
    const intersections: { [rIndex: number]: Dictionary[] } = {}
    for (let rIndex = 0; rIndex < rBranches.length; rIndex++) {
        intersections[rIndex] = []
    }
    for (let lIndex = 0; lIndex < lBranches.length; lIndex++) {
        let lIntersectionsByRIndex: Record<number, Dictionary> = {}
        for (let rIndex = 0; rIndex < rBranches.length; rIndex++) {
            if (!intersections[rIndex]) {
                // if r is a subtype of a branch of l, its index is deleted from
                // intersections so we can skip it
                continue
            }
            const branch = intersection(
                lBranches[lIndex],
                rBranches[rIndex],
                scope
            )
            if (branch === null) {
                continue
            }
            if (branch === undefined || branch === lBranches[lIndex]) {
                result.push(lBranches[lIndex])
                lIntersectionsByRIndex = {}
                if (branch === undefined) {
                    delete intersections[rIndex]
                }
                break
            }
            if (branch === rBranches[rIndex]) {
                delete intersections[rIndex]
            } else {
                lIntersectionsByRIndex[rIndex] = branch
            }
        }
        for (const i in lIntersectionsByRIndex) {
            intersections[i] ??= []
            intersections[i]!.push(lIntersectionsByRIndex[i])
        }
    }
    for (const rIndex in intersections) {
        result.push(...intersections[rIndex])
    }
    return result
    // if (hasKey(lBranch, "value")) {
    //     if (hasKey(rBranch, "value")) {
    //         return lBranch === rBranch ? undefined : null
    //     }
    //     return checkAttributes(lBranch.value, rBranch, scope) ? l : null
    // }
    // if (hasKey(rBranch, "value")) {
    //     return checkAttributes(rBranch.value, lBranch, scope) ? r : null
    // }
    // return attributesIntersection(lBranch, rBranch, scope)
})

const resolveBranches = <typeName extends NarrowableTypeName>(
    branches: List<BranchOf<typeName>>,
    typeName: typeName,
    scope: ScopeRoot
): true | ResolvedBranchOf<typeName>[] => {
    const [unresolved, resolved] = filterSplit(
        branches,
        (branch): branch is string => typeof branch === "string"
    )
    while (unresolved.length) {
        const typeResolution = scope.resolveToType(unresolved.pop()!, typeName)
        if (typeResolution === true) {
            return true
        }
        for (const resolutionBranch of listFrom(typeResolution)) {
            if (typeof resolutionBranch === "string") {
                unresolved.push(resolutionBranch)
            } else {
                resolved.push(resolutionBranch)
            }
        }
    }
    return resolved
}

const filterSplit = <item, condition extends item>(
    list: List<item>,
    by: (item: item) => item is condition
) => {
    const result: [
        included: condition[],
        excluded: Exclude<item, condition>[]
    ] = [[], []]
    for (const item of list) {
        if (by(item)) {
            result[0].push(item)
        } else {
            result[1].push(item as any)
        }
    }
    return result
}
