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

type IntersectionContext = {
    typeName: TypeName
    scope: ScopeRoot
}

const constraintsIntersection = (
    l: BaseConstraints,
    r: BaseConstraints,
    context: IntersectionContext
) => {
    const lTypes = resolveConstraintBranches(l, context.typeName, context.scope)
    const rTypes = resolveConstraintBranches(r, context.typeName, context.scope)
    if (lTypes === true) {
        return rTypes === true ? equivalence : rTypes
    }
    if (rTypes === true) {
        return lTypes
    }
    return compareBranches(lTypes, rTypes, context)
}

const compareBranches = (
    lBranches: BaseKeyedConstraint[],
    rBranches: BaseKeyedConstraint[],
    context: IntersectionContext
) => {
    const result = initializeBranchesIntersectionState(rBranches)
    lBranches.forEach((l) => {
        let lImpliesR = false
        const distinct = result.pairs.map(
            (rData): BaseKeyedConstraint | null => {
                if (lImpliesR || !rData.distinct) {
                    return null
                }
                const r = rData.constraint
                const keyResult = keyedConstraintsIntersection(
                    l,
                    r,
                    context.scope
                )
                switch (keyResult) {
                    case empty:
                        // doesn't tell us about any redundancies or add a distinct pair
                        return null
                    case l:
                        result.lStrictSubtypes.push(l)
                        // If l is a subtype of the current r branch, intersections
                        // with the remaining branches of r won't lead to distinct
                        // branches, so we set a flag indicating we can skip them.
                        lImpliesR = true
                        return null
                    case r:
                        result.rStrictSubtypes.push(r)
                        // If r is a subtype of the current l branch, it is removed
                        // from pairsByR because future intersections won't lead to
                        // distinct branches.
                        rData.distinct = null
                        return null
                    case equivalence:
                        // Combination of l and r subtype cases.
                        result.equivalentTypes.push(l)
                        lImpliesR = true
                        rData.distinct = null
                        return null
                    default:
                        // Neither branch is a subtype of the other, return
                        // the result of the intersection as a candidate
                        // branch for the final union
                        return keyResult
                }
            }
        )
        if (!lImpliesR) {
            for (let i = 0; i < result.pairs.length; i++) {
                if (distinct[i]) {
                    result.pairs[i].distinct?.push(distinct[i]!)
                }
            }
        }
    })
    return compileIntersectedBranches(lBranches, rBranches, result)
}

type BranchComparison = {
    equivalentTypes: BaseKeyedConstraint[]
    lStrictSubtypes: BaseKeyedConstraint[]
    rStrictSubtypes: BaseKeyedConstraint[]
    pairs: {
        constraint: BaseKeyedConstraint
        distinct: BaseKeyedConstraint[] | null
    }[]
}

const initializeBranchesIntersectionState = (
    rBranches: BaseKeyedConstraint[]
): BranchComparison => ({
    equivalentTypes: [],
    lStrictSubtypes: [],
    rStrictSubtypes: [],
    pairs: rBranches.map((constraint) => ({
        constraint,
        distinct: []
    }))
})

const compileIntersectedBranches = (
    lBranches: BaseKeyedConstraint[],
    rBranches: BaseKeyedConstraint[],
    {
        equivalentTypes,
        lStrictSubtypes,
        rStrictSubtypes,
        pairs: pairData
    }: BranchComparison
) => {
    if (
        equivalentTypes.length === lBranches.length &&
        equivalentTypes.length === rBranches.length
    ) {
        return equivalence
    }
    if (lStrictSubtypes.length + equivalentTypes.length === lBranches.length) {
        return rBranches
    }
    if (rStrictSubtypes.length + equivalentTypes.length === rBranches.length) {
        return lBranches
    }
    const finalBranches = [
        ...pairData.flatMap((rData) => rData.distinct ?? []),
        ...equivalentTypes,
        ...lStrictSubtypes,
        ...rStrictSubtypes
    ]
    if (finalBranches.length === 0) {
        return empty
    }
    return finalBranches.length === 1 ? finalBranches[0] : finalBranches
}

export const intersection = composeKeyedOperation<
    BaseNode,
    IntersectionContext
>("&", constraintsIntersection)

const keyedConstraintsIntersection: IntersectionReducer<BaseKeyedConstraint> = (
    l,
    r,
    scope
) =>
    hasKey(l, "value")
        ? hasKey(r, "value")
            ? l.value === r.value
                ? equivalence
                : empty
            : checkAttributes(l.value, r, scope)
            ? l
            : empty
        : hasKey(r, "value")
        ? checkAttributes(r.value, l, scope)
            ? r
            : empty
        : attributesIntersection(l, r, scope)

const resolveConstraintBranches = (
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
