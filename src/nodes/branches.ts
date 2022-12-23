import type { ScopeRoot } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf, hasDomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import { empty, equal } from "./compose.ts"
import { predicateIntersection } from "./intersection.ts"
import type { Condition, Predicate, PredicateComparison } from "./predicate.ts"

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
    scope: ScopeRoot
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
                const keyIntersection = predicateIntersection(
                    domain,
                    l,
                    r,
                    scope
                )
                switch (keyIntersection) {
                    case empty:
                        // doesn't tell us about any redundancies or add a distinct pair
                        return null
                    case l:
                        result.lSubconditionsOfR.push(lIndex)
                        // If l is a subtype of the current r branch, intersections
                        // with the remaining branches of r won't lead to distinct
                        // branches, so we set a flag indicating we can skip them.
                        lImpliesR = true
                        return null
                    case r:
                        result.rSubconditionsOfL.push(rIndex)
                        // If r is a subtype of the current l branch, it is removed
                        // from pairsByR because future intersections won't lead to
                        // distinct branches.
                        rPairs.distinct = null
                        return null
                    case equal:
                        // Combination of l and r subtype cases.
                        result.equalities.push([lIndex, rIndex])
                        lImpliesR = true
                        rPairs.distinct = null
                        return null
                    default:
                        // Neither branch is a subtype of the other, return
                        // the result of the intersection as a candidate
                        // branch for the final union
                        if (hasDomain(keyIntersection, "object")) {
                            return keyIntersection
                        }
                        return throwInternalError(
                            `Unexpected predicate intersection result of type '${domainOf(
                                keyIntersection
                            )}'`
                        )
                }
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
