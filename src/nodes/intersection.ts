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
    BaseNode
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

export const composeKeyedOperation =
    <root extends Dictionary, context = ScopeRoot>(
        operator: "&" | "|",
        reducer: RootIntersectionReducer<root, context>
    ): IntersectionReducer<root, context> =>
    (l, r, context) => {
        const result: mutable<root> = { ...l, ...r }
        let lImpliesR = true
        let rImpliesL = true
        let k: keyof root
        for (k in result) {
            if (l[k] === undefined) {
                if (operator === "|") {
                    rImpliesL = false
                } else {
                    result[k] = r[k]
                    lImpliesR = false
                }
            }
            if (r[k] === undefined) {
                if (operator === "|") {
                    lImpliesR = false
                } else {
                    result[k] = l[k]
                    rImpliesL = false
                }
            }
            const keyResult =
                typeof reducer === "function"
                    ? reducer(l[k], r[k], context)
                    : reducer[k](l[k], r[k], context)
            if (keyResult === equivalence) {
                result[k] = l[k]
            } else if (keyResult === empty) {
                if (operator === "&") {
                    // TODO : Case for optional props
                    return empty
                }
                delete result[k]
                lImpliesR = false
                rImpliesL = false
            } else {
                result[k] = keyResult
                lImpliesR &&= keyResult === l[k]
                rImpliesL &&= keyResult === r[k]
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

const attributesIntersection = composeKeyedOperation<BaseAttributes>("&", {
    subtype: disjointIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection,
    props: propsIntersection,
    requiredKeys: requiredKeysIntersection,
    propTypes: propsIntersection,
    bounds: boundsIntersection
})

export const intersection = composeKeyedOperation<
    BaseNode,
    {
        typeName: TypeName
        scope: ScopeRoot
    }
>(
    "&",
    (lConstraints, rConstraints, context) => {
        const lTypes = resolveConstraints(
            lConstraints,
            context.typeName,
            context.scope
        )
        const rTypes = resolveConstraints(
            rConstraints,
            context.typeName,
            context.scope
        )
        if (lTypes === true) {
            return rTypes === true ? equivalence : rTypes
        }
        if (rTypes === true) {
            return lTypes
        }
        const equivalentTypes: BaseKeyedConstraint[] = []
        const lStrictSubtypes: BaseKeyedConstraint[] = []
        const rStrictSubtypes: BaseKeyedConstraint[] = []
        const pairData = rTypes.map((constraint) => ({
            constraint,
            pairs: [] as BaseKeyedConstraint[] | null
        }))
        lTypes.forEach((l) => {
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
                            lStrictSubtypes.push(l)
                            // If l is a subtype of the current r branch, intersections
                            // with the remaining branches of r won't lead to distinct
                            // branches, so we set a flag indicating we can skip them.
                            lImpliesR = true
                            return null
                        case r:
                            rStrictSubtypes.push(r)
                            // If r is a subtype of the current l branch, it is removed
                            // from pairsByR because future intersections won't lead to
                            // distinct branches.
                            rData.pairs = null
                            return null
                        case equivalence:
                            // Combination of l and r subtype cases.
                            equivalentTypes.push(l)
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
        if (
            equivalentTypes.length === lTypes.length &&
            equivalentTypes.length === rTypes.length
        ) {
            return equivalence
        }
        if (lStrictSubtypes.length + equivalentTypes.length === lTypes.length) {
            return lConstraints
        }
        if (rStrictSubtypes.length + equivalentTypes.length === rTypes.length) {
            return rConstraints
        }
        const finalBranches = [
            ...pairData.flatMap((rData) => rData.pairs ?? []),
            ...equivalentTypes,
            ...lStrictSubtypes,
            ...rStrictSubtypes
        ]
        if (finalBranches.length === 0) {
            return empty
        }
        return finalBranches.length === 1 ? finalBranches[0] : finalBranches
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
