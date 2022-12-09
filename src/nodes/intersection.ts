import type { ScopeRoot } from "../scope.js"
import { filterSplit } from "../utils/filterSplit.js"
import type {
    Dictionary,
    List,
    mutable,
    NonNullish
} from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import { boundsIntersection } from "./bounds.js"
import { divisorIntersection } from "./divisor.js"
import type {
    BaseAttributes,
    BranchOf,
    NarrowableTypeName,
    Node,
    ResolvedBranchOf
} from "./node.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"
import { regexIntersection } from "./regex.js"

export type IntersectionReducer<t, context = ScopeRoot> = (
    l: t,
    r: t,
    context: context
) => t | empty | equivalence

export const empty = Symbol("empty")

export type empty = typeof empty

export const equivalence = Symbol("equivalent")

export type equivalence = typeof equivalence

export type KeyIntersectionReducerMap<root extends Dictionary, context> = {
    [k in keyof root]-?: IntersectionReducer<root[k], context>
}

export type RootIntersectionReducer<root extends Dictionary, context> =
    | KeyIntersectionReducerMap<Required<root>, context>
    | IntersectionReducer<Required<root>[keyof root], context>

export type ComposeKeyIntersectionOptions = {
    branching?: true
}

export const composeKeyedIntersection =
    <root extends Dictionary, context = ScopeRoot>(
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
                    if (keyResult === equivalence) {
                        result[k] = l[k]
                    } else if (keyResult === empty) {
                        return empty
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
        return lImpliesR
            ? rImpliesL
                ? equivalence
                : l
            : rImpliesL
            ? r
            : result
    }

export const disjointIntersection = (l: string, r: string) =>
    l === r ? equivalence : empty

const attributesIntersection = composeKeyedIntersection<BaseAttributes>({
    subtype: disjointIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection,
    props: propsIntersection,
    requiredKeys: requiredKeysIntersection,
    propTypes: propsIntersection,
    bounds: boundsIntersection
})

export const intersection = composeKeyedIntersection<Node>(
    (l, r, scope) => {
        if (l === true) {
            return r === true ? equivalence : r
        }
        if (r === true) {
            return l
        }
        // TODO: Fix types
        const lBranches = listFrom(l) as List<Dictionary>
        const rBranches = listFrom(r) as List<Dictionary>
        const distinctBranches: Dictionary[] = []
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
                const result = intersection(
                    lBranches[lIndex],
                    rBranches[rIndex],
                    scope
                )
                if (result === empty) {
                    continue
                }
                if (result === equivalence || result === lBranches[lIndex]) {
                    distinctBranches.push(lBranches[lIndex])
                    lIntersectionsByRIndex = {}
                    if (result === equivalence) {
                        delete intersections[rIndex]
                    }
                    break
                }
                if (result === rBranches[rIndex]) {
                    delete intersections[rIndex]
                } else {
                    lIntersectionsByRIndex[rIndex] = result
                }
            }
            for (const i in lIntersectionsByRIndex) {
                intersections[i] ??= []
                intersections[i]!.push(lIntersectionsByRIndex[i])
            }
        }
        for (const rIndex in intersections) {
            distinctBranches.push(...intersections[rIndex])
        }
        return distinctBranches
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
    },
    { branching: true }
)

const resolveBranches = <typeName extends NarrowableTypeName>(
    branches: List<BranchOf<typeName>>,
    typeName: typeName,
    scope: ScopeRoot
): true | ResolvedBranchOf<typeName>[] => {
    const [resolved, unresolved] = filterSplit<
        BranchOf<typeName>,
        ResolvedBranchOf<typeName>,
        string
    >(
        branches,
        (branch): branch is ResolvedBranchOf<typeName> =>
            typeof branch === "object"
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
                resolved.push(resolutionBranch as any)
            }
        }
    }
    return resolved
}
