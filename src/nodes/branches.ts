import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/classify.js"
import { classify, hasDomain } from "../utils/classify.js"
import { throwInternalError } from "../utils/errors.js"
import type { List } from "../utils/generics.js"
import { empty, equal } from "./compose.js"
import { predicateIntersection } from "./intersection.js"
import type { Condition, Predicate, PredicateComparison } from "./predicate.js"

export const isBranchComparison = (
    comparison: PredicateComparison
): comparison is BranchComparison =>
    (comparison as BranchComparison)?.lConditions !== undefined

export type BranchComparison = {
    lConditions: List<Condition>
    rConditions: List<Condition>
    lSubconditionsOfR: number[]
    rSubconditionsOfL: number[]
    equalPairs: [lIndex: number, rIndex: number][]
    codependentIntersections: List<Condition>
}

export const compareBranches = (
    domain: Domain,
    lConditions: List<Condition>,
    rConditions: List<Condition>,
    scope: ScopeRoot
): BranchComparison => {
    const result: BranchComparison = {
        lConditions,
        rConditions,
        lSubconditionsOfR: [],
        rSubconditionsOfL: [],
        equalPairs: [],
        codependentIntersections: []
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
                        result.equalPairs.push([lIndex, rIndex])
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
                            `Unexpected predicate intersection result of type '${classify(
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
    result.codependentIntersections = pairs.flatMap(
        (pairs) => pairs.distinct ?? []
    )
    return result
}
