import type { ScopeRoot } from "../scope.js"
import { filterSplit } from "../utils/filterSplit.js"
import type { Dictionary, mutable } from "../utils/generics.js"
import { hasKey, listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import { boundsIntersection } from "./bounds.js"
import { checkAttributes } from "./check.js"
import { divisorIntersection } from "./divisor.js"
import type {
    BaseAttributes,
    BaseConstraints,
    BaseKeyedConstraint,
    Node
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

export const intersection = composeKeyedIntersection<
    Node,
    { typeName: TypeName; scope: ScopeRoot }
>(
    (lConstraints, rConstraints, context) => {
        const lResolution = resolveConstraints(
            lConstraints,
            context.typeName,
            context.scope
        )
        const rResolution = resolveConstraints(
            rConstraints,
            context.typeName,
            context.scope
        )
        if (lResolution === true) {
            return rResolution === true ? equivalence : rResolution
        }
        if (rResolution === true) {
            return lResolution
        }
        const distinctBranches: Dictionary[] = []
        const intersections: { [rIndex: number]: Dictionary[] } = {}
        for (let rIndex = 0; rIndex < rResolution.length; rIndex++) {
            intersections[rIndex] = []
        }
        // TODO- ensure l or r is returned for subtype
        for (let lIndex = 0; lIndex < lResolution.length; lIndex++) {
            const l = lResolution[lIndex]
            let lIntersectionsByRIndex: Record<number, Dictionary> = {}
            for (let rIndex = 0; rIndex < rResolution.length; rIndex++) {
                if (!intersections[rIndex]) {
                    // if r is a subtype of a branch of l, its index is deleted from
                    // intersections so we can skip it
                    continue
                }
                const r = rResolution[rIndex]
                const result = hasKey(l, "value")
                    ? hasKey(r, "value")
                        ? l.value === r.value
                            ? equivalence
                            : empty
                        : checkAttributes(l.value, r, context.scope)
                        ? l
                        : empty
                    : hasKey(r, "value")
                    ? checkAttributes(r.value, l, context.scope)
                        ? r
                        : empty
                    : attributesIntersection(l, r, context.scope)
                if (result === empty) {
                    continue
                }
                if (result === equivalence || result === l) {
                    distinctBranches.push(lResolution[lIndex])
                    lIntersectionsByRIndex = {}
                    if (result === equivalence) {
                        delete intersections[rIndex]
                    }
                    break
                }
                if (result === rResolution[rIndex]) {
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
    },
    { branching: true }
)

const resolveConstraints = (
    typeConstraints: BaseConstraints,
    typeName: TypeName,
    scope: ScopeRoot
): true | BaseKeyedConstraint[] => {
    if (typeConstraints === true) {
        return true
    }
    const [unresolved, resolved] = filterSplit(
        listFrom(typeConstraints),
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
