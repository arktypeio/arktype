import type { ScopeRoot } from "../scope.js"
import type { Domain, inferDomain } from "../utils/classify.js"
import type { CollapsibleList, Dictionary } from "../utils/generics.js"
import type { SetOperationResult } from "./compose.js"
import { empty, equal } from "./compose.js"
import { branchResolutionIntersection } from "./intersection.js"
import type { Identifier } from "./node.js"
import type { RuleSet } from "./rules/rules.js"
import { resolvePredicate } from "./utils.js"

export type Predicate<
    domain extends Domain = Domain,
    scope extends Dictionary = Dictionary
> = true | CollapsibleList<Condition<domain, scope>>

export type Condition<
    domain extends Domain = Domain,
    scope extends Dictionary = Dictionary
> = RuleSet<domain, scope> | ExactValue<domain> | Identifier<scope>

export type ExactValue<domain extends Domain> = {
    readonly value: inferDomain<domain>
}

export type PredicateContext = {
    domain: Domain
    scope: ScopeRoot
}

export const comparePredicates = (
    l: Predicate,
    r: Predicate,
    context: PredicateContext
): PredicateComparison => {
    const lConditions = resolvePredicate(context.domain, l, context.scope)
    const rConditions = resolvePredicate(context.domain, r, context.scope)
    if (lConditions === true) {
        return rConditions === true ? equal : r
    }
    if (rConditions === true) {
        return l
    }
    const comparison = compareConditions(lConditions, rConditions, context)
    if (
        comparison.equal.length === lConditions.length &&
        comparison.equal.length === rConditions.length
    ) {
        return equal
    }
    if (
        comparison.lSubconditionsOfR.length + comparison.equal.length ===
        lConditions.length
    ) {
        return l
    }
    if (
        comparison.rSubconditionsOfL.length + comparison.equal.length ===
        rConditions.length
    ) {
        return r
    }
    return comparison
}

type PredicateComparison = SetOperationResult<Predicate> | ConditionsComparison

export const isConditionsComparison = (
    comparison: PredicateComparison
): comparison is ConditionsComparison =>
    (comparison as ConditionsComparison)?.lConditions !== undefined

type ConditionsComparison = {
    lConditions: Condition[]
    rConditions: Condition[]
    lSubconditionsOfR: number[]
    rSubconditionsOfL: number[]
    equal: [lIndex: number, rIndex: number][]
    intersections: Condition[]
}

const compareConditions = (
    lConditions: Condition[],
    rConditions: Condition[],
    context: PredicateContext
): ConditionsComparison => {
    const result: ConditionsComparison = {
        lConditions,
        rConditions,
        lSubconditionsOfR: [],
        rSubconditionsOfL: [],
        equal: [],
        intersections: []
    }
    const pairs = rConditions.map((condition) => ({
        constraint: condition,
        distinct: [] as Condition[] | null
    }))
    lConditions.forEach((l, lIndex) => {
        let lImpliesR = false
        const distinct = pairs.map((rData, rIndex): Condition | null => {
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
                    rData.distinct = null
                    return null
                case equal:
                    // Combination of l and r subtype cases.
                    result.equal.push([lIndex, rIndex])
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
            for (let i = 0; i < pairs.length; i++) {
                if (distinct[i]) {
                    pairs[i].distinct?.push(distinct[i]!)
                }
            }
        }
    })
    result.intersections = pairs.flatMap((pairs) => pairs.distinct ?? [])
    return result
}
