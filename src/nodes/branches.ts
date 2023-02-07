import { domainOf, hasDomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { List } from "../utils/generics.ts"
import type { IntersectionState } from "./compose.ts"
import { isDisjoint, isEquality } from "./compose.ts"
import type { Branch, PredicateComparison } from "./predicate.ts"
import { branchIntersection } from "./rules/rules.ts"

export const isBranchComparison = (
    comparison: PredicateComparison
): comparison is BranchesComparison =>
    (comparison as BranchesComparison)?.lBranches !== undefined

export type Branches = List<Branch>

export type BranchesComparison = {
    lBranches: Branches
    rBranches: Branches
    lExtendsR: number[]
    rExtendsL: number[]
    equalities: [lIndex: number, rIndex: number][]
    distinctIntersections: Branches
}

export const compareBranches = (
    lConditions: Branches,
    rConditions: Branches,
    state: IntersectionState
): BranchesComparison => {
    const result: BranchesComparison = {
        lBranches: lConditions,
        rBranches: rConditions,
        lExtendsR: [],
        rExtendsL: [],
        equalities: [],
        distinctIntersections: []
    }
    const pairs = rConditions.map((condition) => ({
        condition,
        distinct: [] as Branch[] | null
    }))
    lConditions.forEach((l, lIndex) => {
        let lImpliesR = false
        const distinct = pairs.map((rPairs, rIndex): Branch | null => {
            if (lImpliesR || !rPairs.distinct) {
                return null
            }
            const r = rPairs.condition
            const subresult = branchIntersection(l, r, state)
            if (isDisjoint(subresult)) {
                // doesn't tell us about any redundancies or add a distinct pair
                return null
            } else if (subresult === l) {
                result.lExtendsR.push(lIndex)
                // If l is a subtype of the current r branch, intersections
                // with the remaining branches of r won't lead to distinct
                // branches, so we set a flag indicating we can skip them.
                lImpliesR = true
                return null
            } else if (subresult === r) {
                result.rExtendsL.push(rIndex)
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
        })
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
