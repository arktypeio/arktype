import type { ScopeRoot } from "../scope.js"
import { filterSplit } from "../utils/filterSplit.js"
import type { Dictionary, mutable } from "../utils/generics.js"
import { hasKey, listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import { boundsIntersection } from "./bounds.js"
import { checkAttributes } from "./check.js"
import { divisorIntersection } from "./divisor.js"
import { keywords } from "./names.js"
import type {
    BaseAttributes,
    BaseConstraints,
    BaseKeyedConstraint,
    BaseNode,
    Node
} from "./node.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"
import { regexIntersection } from "./regex.js"
import { coalesceBranches } from "./union.js"

export type SetOperation<t> = (l: t, r: t) => SetOperationResult<t>

export type ContextualSetOperation<t, context> = (
    l: t,
    r: t,
    context: context
) => SetOperationResult<t>

export type SetOperationResult<t> = t | empty | equivalence

export const empty = Symbol("empty")

export type empty = typeof empty

export const equivalence = Symbol("equivalent")

export type equivalence = typeof equivalence

export type KeyIntersectionReducerMap<root extends Dictionary, context> = {
    [k in keyof root]-?: ContextualSetOperation<root[k], context>
}

type definedPropOf<root extends Dictionary> = Required<root>[keyof root]

export type KeyedContextualSetOperation<root extends Dictionary, context> = (
    key: keyof root,
    l: definedPropOf<root>,
    r: definedPropOf<root>,
    context: context
) => SetOperationResult<definedPropOf<root>>

export type RootIntersectionReducer<root extends Dictionary, context> =
    | KeyIntersectionReducerMap<Required<root>, context>
    | KeyedContextualSetOperation<root, context>

export const composeKeyedOperation =
    <root extends Dictionary, context>(
        operator: "&" | "|",
        reducer: RootIntersectionReducer<root, context>
    ): ContextualSetOperation<root, context> =>
    (l, r, context) => {
        const result: mutable<root> = { ...l, ...r }
        let lImpliesR = true
        let rImpliesL = true
        let k: keyof root
        for (k in result) {
            if (l[k] === undefined) {
                if (operator === "|") {
                    result[k] = r[k]
                    rImpliesL = false
                } else {
                    lImpliesR = false
                }
            }
            if (r[k] === undefined) {
                if (operator === "|") {
                    result[k] = l[k]
                    lImpliesR = false
                } else {
                    rImpliesL = false
                }
            }
            const keyResult =
                typeof reducer === "function"
                    ? reducer(k, l[k], r[k], context)
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

const attributesIntersection = composeKeyedOperation<
    BaseAttributes,
    ConstraintContext
>("&", {
    subtype: disjointIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection,
    props: propsIntersection,
    requiredKeys: requiredKeysIntersection,
    propTypes: propsIntersection,
    bounds: boundsIntersection
})

export type ConstraintContext = {
    typeName: TypeName
    scope: ScopeRoot
}

export const compareConstraints = (
    l: BaseConstraints,
    r: BaseConstraints,
    context: ConstraintContext
): ConstraintComparison => {
    const lBranches = resolveConstraintBranches(
        l,
        context.typeName,
        context.scope
    )
    const rBranches = resolveConstraintBranches(
        r,
        context.typeName,
        context.scope
    )
    if (lBranches === true) {
        return rBranches === true ? equivalence : r
    }
    if (rBranches === true) {
        return l
    }
    const branchComparison = compareBranches(lBranches, rBranches, context)
    if (
        branchComparison.equivalentTypes.length === lBranches.length &&
        branchComparison.equivalentTypes.length === rBranches.length
    ) {
        return equivalence
    }
    if (
        branchComparison.lStrictSubtypes.length +
            branchComparison.equivalentTypes.length ===
        lBranches.length
    ) {
        return r
    }
    if (
        branchComparison.rStrictSubtypes.length +
            branchComparison.equivalentTypes.length ===
        rBranches.length
    ) {
        return l
    }
    return branchComparison
}

type ConstraintComparison =
    | SetOperationResult<BaseConstraints>
    | BranchComparison

export const isSubtypeComparison = (
    comparison: ConstraintComparison
): comparison is SetOperationResult<BaseConstraints> =>
    (comparison as BranchComparison).lBranches === undefined

type BranchComparison = {
    lBranches: BaseKeyedConstraint[]
    rBranches: BaseKeyedConstraint[]
    lStrictSubtypes: number[]
    rStrictSubtypes: number[]
    equivalentTypes: EquivalentIndexPair[]
    distinctIntersections: BaseKeyedConstraint[]
}

type EquivalentIndexPair = [lIndex: number, rIndex: number]

const compareBranches = (
    lBranches: BaseKeyedConstraint[],
    rBranches: BaseKeyedConstraint[],
    context: ConstraintContext
): BranchComparison => {
    const comparison: BranchComparison = {
        lBranches,
        rBranches,
        lStrictSubtypes: [],
        rStrictSubtypes: [],
        equivalentTypes: [],
        distinctIntersections: []
    }
    const pairsByR = rBranches.map((constraint) => ({
        constraint,
        distinct: [] as BaseKeyedConstraint[] | null
    }))
    lBranches.forEach((l, lIndex) => {
        let lImpliesR = false
        const distinct = pairsByR.map(
            (rData, rIndex): BaseKeyedConstraint | null => {
                if (lImpliesR || !rData.distinct) {
                    return null
                }
                const r = rData.constraint
                const keyResult = keyedConstraintsIntersection(l, r, context)
                switch (keyResult) {
                    case empty:
                        // doesn't tell us about any redundancies or add a distinct pair
                        return null
                    case l:
                        comparison.lStrictSubtypes.push(lIndex)
                        // If l is a subtype of the current r branch, intersections
                        // with the remaining branches of r won't lead to distinct
                        // branches, so we set a flag indicating we can skip them.
                        lImpliesR = true
                        return null
                    case r:
                        comparison.rStrictSubtypes.push(rIndex)
                        // If r is a subtype of the current l branch, it is removed
                        // from pairsByR because future intersections won't lead to
                        // distinct branches.
                        rData.distinct = null
                        return null
                    case equivalence:
                        // Combination of l and r subtype cases.
                        comparison.equivalentTypes.push([lIndex, rIndex])
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
            for (let i = 0; i < pairsByR.length; i++) {
                if (distinct[i]) {
                    pairsByR[i].distinct?.push(distinct[i]!)
                }
            }
        }
    })
    comparison.distinctIntersections = pairsByR.flatMap(
        (pairs) => pairs.distinct ?? []
    )
    return comparison
}

export const nodeIntersection = composeKeyedOperation<BaseNode, ScopeRoot>(
    "&",
    (typeName, l, r, scope) => {
        const comparison = compareConstraints(l, r, { typeName, scope })
        if (isSubtypeComparison(comparison)) {
            return comparison
        }
        const finalBranches = [
            ...comparison.distinctIntersections,
            ...comparison.equivalentTypes.map(
                (indices) => comparison.lBranches[indices[0]]
            ),
            ...comparison.lStrictSubtypes.map(
                (lIndex) => comparison.lBranches[lIndex]
            ),
            ...comparison.rStrictSubtypes.map(
                (rIndex) => comparison.rBranches[rIndex]
            )
        ]
        return coalesceBranches(typeName, finalBranches)
    }
)

export const intersection = (l: Node, r: Node, scope: ScopeRoot): Node =>
    finalizeNodeOperation(l, nodeIntersection(l, r, scope))

export const finalizeNodeOperation = (
    l: Node,
    result: SetOperationResult<BaseNode>
): Node =>
    result === empty ? keywords.never : result === equivalence ? l : result

const keyedConstraintsIntersection: ContextualSetOperation<
    BaseKeyedConstraint,
    ConstraintContext
> = (l, r, context) =>
    hasKey(l, "value")
        ? hasKey(r, "value")
            ? l.value === r.value
                ? equivalence
                : empty
            : checkAttributes(l.value, r, context)
            ? l
            : empty
        : hasKey(r, "value")
        ? checkAttributes(r.value, l, context)
            ? r
            : empty
        : attributesIntersection(l, r, context)

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
