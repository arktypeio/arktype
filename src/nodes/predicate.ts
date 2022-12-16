import type { ScopeRoot } from "../scope.js"
import { checkRules } from "../traverse/check.js"
import type { Domain, inferDomain } from "../utils/classify.js"
import { hasObjectDomain } from "../utils/classify.js"
import type { CollapsibleList, Dictionary, List } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { SetOperationResult } from "./compose.js"
import { empty, equal } from "./compose.js"
import { predicateIntersection } from "./intersection.js"
import type { Identifier } from "./node.js"
import type { RuleSet } from "./rules/rules.js"
import { rulesIntersection } from "./rules/rules.js"
import { resolvePredicateIfIdentifier } from "./utils.js"

export type Predicate<
    domain extends Domain = Domain,
    scope extends Dictionary = Dictionary
> = true | CollapsibleList<Condition<domain, scope>>

export type Condition<
    domain extends Domain = Domain,
    scope extends Dictionary = Dictionary
> = RuleSet<domain, scope> | ExactValue<domain> | Identifier<scope>

export type ExactValue<domain extends Domain = Domain> = {
    readonly value: inferDomain<domain>
}

export const isExactValue = (predicate: Predicate): predicate is ExactValue =>
    typeof predicate === "object" && "value" in predicate

export type PredicateContext = {
    domain: Domain
    scope: ScopeRoot
}

export const comparePredicates = (
    domain: Domain,
    l: Predicate,
    r: Predicate,
    scope: ScopeRoot
): PredicateComparison => {
    const lResolution = resolvePredicateIfIdentifier(domain, l, scope)
    const rResolution = resolvePredicateIfIdentifier(domain, l, scope)
    if (lResolution === true) {
        return rResolution === true ? equal : r
    }
    if (rResolution === true) {
        return l
    }
    if (
        hasObjectDomain(lResolution, "Object") &&
        hasObjectDomain(rResolution, "Object")
    ) {
        return isExactValue(lResolution)
            ? isExactValue(rResolution)
                ? lResolution.value === rResolution.value
                    ? equal
                    : empty
                : checkRules(domain, lResolution.value, rResolution, scope)
                ? l
                : empty
            : isExactValue(rResolution)
            ? checkRules(domain, rResolution.value, lResolution, scope)
                ? r
                : empty
            : rulesIntersection(lResolution, rResolution, { domain, scope })
    }
    const lComparisons = listFrom(lResolution)
    const rComparisons = listFrom(rResolution)
    const comparison = compareBranches(
        domain,
        lComparisons,
        rComparisons,
        scope
    )
    // TODO: Abstract these into comparison functions, clarify meaning across union/intersection
    if (
        comparison.equalPairs.length === lComparisons.length &&
        comparison.equalPairs.length === rComparisons.length
    ) {
        return equal
    }
    if (
        comparison.lSubconditionsOfR.length + comparison.equalPairs.length ===
        lComparisons.length
    ) {
        return l
    }
    if (
        comparison.rSubconditionsOfL.length + comparison.equalPairs.length ===
        rComparisons.length
    ) {
        return r
    }
    return comparison
}

type PredicateComparison = SetOperationResult<Predicate> | BranchComparison

export type PredicateComparisonReducer = (
    comparison: PredicateComparison
) => SetOperationResult<Predicate>

export const isBranchComparison = (
    comparison: PredicateComparison
): comparison is BranchComparison =>
    (comparison as BranchComparison)?.intersections !== undefined

type BranchComparison = {
    lConditions: List<Condition>
    rConditions: List<Condition>
    lSubconditionsOfR: number[]
    rSubconditionsOfL: number[]
    equalPairs: [lIndex: number, rIndex: number][]
    intersections: List<Condition>
}

const compareBranches = (
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
        intersections: []
    }
    const pairs = rConditions.map((condition) => ({
        condition,
        distinct: [] as Condition[] | null
    }))
    lConditions.forEach((l, lIndex) => {
        let lImpliesR = false
        const distinct = pairs.map((rPairs, rIndex): Condition | null => {
            if (lImpliesR || !rPairs.distinct) {
                return null
            }
            const r = rPairs.condition
            const keyIntersection = predicateIntersection(domain, l, r, scope)
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
                    // TODO: Fix type here, should be able to handle lists etc. as well.
                    // Should maybe add all branches from list result?
                    return keyIntersection as any
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
