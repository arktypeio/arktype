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
        const mutualSubtypes: BaseKeyedConstraint[] = []
        const lSubtypes: BaseKeyedConstraint[] = []
        const rSubtypes: BaseKeyedConstraint[] = []
        const pairData = rResolution.map((constraint) => ({
            constraint,
            pairs: [] as BaseKeyedConstraint[] | null
        }))
        // TODO- ensure l or r is returned for subtype
        lResolution.forEach((l) => {
            let lImpliesR = false
            const distinctPairs = pairData.map(
                (rData): BaseKeyedConstraint | null => {
                    if (lImpliesR || !rData.pairs) {
                        return null
                    }
                    const r = rData.constraint
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
                    switch (result) {
                        case empty:
                            // doesn't tell us about any redundancies or add a distinct pair
                            return null
                        case l:
                            lSubtypes.push(l)
                            // If l is a subtype of the current r branch, intersections
                            // with the remaining branches of r won't lead to distinct
                            // branches, so we set a flag indicating we can skip them.
                            lImpliesR = true
                            return null
                        case r:
                            rSubtypes.push(r)
                            // If r is a subtype of the current l branch, it is removed
                            // from pairsByR because future intersections won't lead to
                            // distinct branches.
                            rData.pairs = null
                            return null
                        case equivalence:
                            // Combination of l and r subtype cases.
                            mutualSubtypes.push(l)
                            lImpliesR = true
                            rData.pairs = null
                            return null
                        default:
                            // Neither branch is a subtype of the other, return
                            // the result of the intersection as a candidate
                            // branch for the final union
                            return result
                    }
                }
            )
            if (!lImpliesR) {
                for (let i = 0; i < pairData.length; i++) {
                    if (distinctPairs[i]) {
                        pairData[i].pairs?.push(distinctPairs[i]!)
                    }
                }
            }
        })
        for (const rIndex in pairData) {
            rSubtypes.push(...pairData[rIndex])
        }
        return rSubtypes
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
