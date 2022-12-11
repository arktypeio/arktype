import type { ScopeRoot } from "../scope.js"
import type { TypeName } from "../utils/typeOf.js"
import { keyedConstraintsIntersection } from "./intersection.js"
import type { BaseConstraints, BaseKeyedConstraint } from "./node.js"
import type { SetOperationResult } from "./operation.js"
import { empty, equivalence } from "./operation.js"
import { resolveConstraintBranches } from "./utils.js"

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
