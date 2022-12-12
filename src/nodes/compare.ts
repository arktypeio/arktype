import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/domainOf.js"
import type { SetOperationResult } from "./compose.js"
import { empty, equivalence } from "./compose.js"
import { branchResolutionIntersection } from "./intersection.js"
import type { UnknownPredicate, UnknownRule } from "./node.js"
import { resolvePredicate } from "./utils.js"

export type PredicateContext = {
    domain: Domain
    scope: ScopeRoot
}

export const comparePredicates = (
    l: UnknownPredicate,
    r: UnknownPredicate,
    context: PredicateContext
): PredicateComparison => {
    const lBranches = resolvePredicate(context.domain, l, context.scope)
    const rBranches = resolvePredicate(context.domain, r, context.scope)
    if (lBranches === true) {
        return rBranches === true ? equivalence : r
    }
    if (rBranches === true) {
        return l
    }
    const branchComparison = compareRules(lBranches, rBranches, context)
    if (
        branchComparison.equivalences.length === lBranches.length &&
        branchComparison.equivalences.length === rBranches.length
    ) {
        return equivalence
    }
    if (
        branchComparison.lSubrulesOfR.length +
            branchComparison.equivalences.length ===
        lBranches.length
    ) {
        return l
    }
    if (
        branchComparison.rSubrulesOfL.length +
            branchComparison.equivalences.length ===
        rBranches.length
    ) {
        return r
    }
    return branchComparison
}

type PredicateComparison =
    | SetOperationResult<UnknownPredicate>
    | BranchesComparison

export const isBranchesComparison = (
    comparison: PredicateComparison
): comparison is BranchesComparison =>
    (comparison as BranchesComparison)?.lRules !== undefined

type BranchesComparison = {
    lRules: UnknownRule[]
    rRules: UnknownRule[]
    lSubrulesOfR: number[]
    rSubrulesOfL: number[]
    equivalences: EquivalentIndexPair[]
    intersections: UnknownRule[]
}

type EquivalentIndexPair = [lIndex: number, rIndex: number]

const compareRules = (
    lRules: UnknownRule[],
    rRules: UnknownRule[],
    context: PredicateContext
): BranchesComparison => {
    const comparison: BranchesComparison = {
        lRules,
        rRules,
        lSubrulesOfR: [],
        rSubrulesOfL: [],
        equivalences: [],
        intersections: []
    }
    const pairsByR = rRules.map((constraint) => ({
        constraint,
        distinct: [] as UnknownRule[] | null
    }))
    lRules.forEach((l, lIndex) => {
        let lImpliesR = false
        const distinct = pairsByR.map((rData, rIndex): UnknownRule | null => {
            if (lImpliesR || !rData.distinct) {
                return null
            }
            const r = rData.constraint
            const keyResult = branchResolutionIntersection(l, r, context)
            switch (keyResult) {
                case empty:
                    // doesn't tell us about any redundancies or add a distinct pair
                    return null
                case l:
                    comparison.lSubrulesOfR.push(lIndex)
                    // If l is a subtype of the current r branch, intersections
                    // with the remaining branches of r won't lead to distinct
                    // branches, so we set a flag indicating we can skip them.
                    lImpliesR = true
                    return null
                case r:
                    comparison.rSubrulesOfL.push(rIndex)
                    // If r is a subtype of the current l branch, it is removed
                    // from pairsByR because future intersections won't lead to
                    // distinct branches.
                    rData.distinct = null
                    return null
                case equivalence:
                    // Combination of l and r subtype cases.
                    comparison.equivalences.push([lIndex, rIndex])
                    lImpliesR = true
                    rData.distinct = null
                    return null
                default:
                    // Neither branch is a subtype of the other, return
                    // the result of the intersection as a candidate
                    // branch for the final union
                    return keyResult
            }
        })
        if (!lImpliesR) {
            for (let i = 0; i < pairsByR.length; i++) {
                if (distinct[i]) {
                    pairsByR[i].distinct?.push(distinct[i]!)
                }
            }
        }
    })
    comparison.intersections = pairsByR.flatMap((pairs) => pairs.distinct ?? [])
    return comparison
}
