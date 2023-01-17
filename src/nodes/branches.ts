import type { Domain } from "../utils/domains.ts"
import { domainOf, hasDomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { OperationContext } from "./compose.ts"
import { isDisjoint, isEquality } from "./compose.ts"
import type { Condition, Predicate, PredicateComparison } from "./predicate.ts"
import { predicateIntersection } from "./predicate.ts"

export const isBranchComparison = (
    comparison: PredicateComparison
): comparison is BranchesComparison =>
    (comparison as BranchesComparison)?.lConditions !== undefined

export type Branches = readonly Condition[]

export type BranchesComparison = {
    lConditions: Branches
    rConditions: Branches
    lSubconditionsOfR: number[]
    rSubconditionsOfL: number[]
    equalities: [lIndex: number, rIndex: number][]
    distinctIntersections: Branches
}

export const compareBranches = (
    domain: Domain,
    lConditions: Branches,
    rConditions: Branches,
    context: OperationContext
): BranchesComparison => {
    const result: BranchesComparison = {
        lConditions,
        rConditions,
        lSubconditionsOfR: [],
        rSubconditionsOfL: [],
        equalities: [],
        distinctIntersections: []
    }
    const pairs = rConditions.map((condition) => ({
        condition,
        distinct: [] as Condition[] | null
    }))
    lConditions.forEach((l, lIndex) => {
        let lImpliesR = false
        const distinct = pairs.flatMap(
            (rPairs, rIndex): Exclude<Predicate, true> | null => {
                if (lImpliesR || !rPairs.distinct) {
                    return null
                }
                const r = rPairs.condition
                const subresult = predicateIntersection(domain, l, r, context)
                if (isDisjoint(subresult)) {
                    // doesn't tell us about any redundancies or add a distinct pair
                    return null
                } else if (subresult === l) {
                    result.lSubconditionsOfR.push(lIndex)
                    // If l is a subtype of the current r branch, intersections
                    // with the remaining branches of r won't lead to distinct
                    // branches, so we set a flag indicating we can skip them.
                    lImpliesR = true
                    return null
                } else if (subresult === r) {
                    result.rSubconditionsOfL.push(rIndex)
                    // If r is a subtype of the current l branch, it is removed
                    // from pairsByR because future intersections won't lead to
                    // distinct branches.
                    rPairs.distinct = null
                    return null
                } else if (isEquality(subresult)) {
                    // Combination of l and r subtype cases.
                    result.equalities.push([lIndex, rIndex])
                    lImpliesR = true
                    rPairs.distinct = null
                    return null
                } else if (hasDomain(subresult, "object")) {
                    // Neither branch is a subtype of the other, return
                    // the result of the intersection as a candidate
                    // branch for the final union
                    return subresult
                }
                return throwInternalError(
                    `Unexpected predicate intersection result of type '${domainOf(
                        subresult
                    )}'`
                )
            }
        )
        if (!lImpliesR) {
            for (let i = 0; i < pairs.length; i++) {
                if (distinct[i]) {
                    pairs[i].distinct?.push(distinct[i]!)
                }
            }
        }
    })
    result.distinctIntersections = pairs.flatMap(
        (pairs) => pairs.distinct ?? []
    )
    return result
}
