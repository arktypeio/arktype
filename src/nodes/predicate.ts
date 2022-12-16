import type { ScopeRoot } from "../scope.js"
import { checkRules } from "../traverse/check.js"
import type { Domain, inferDomain } from "../utils/classify.js"
import { hasObjectDomain } from "../utils/classify.js"
import type { CollapsibleList, Dictionary, List } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { SetOperationResult } from "./compose.js"
import { empty, equal } from "./compose.js"
import type { Identifier } from "./node.js"
import type { RuleSet } from "./rules/rules.js"
import { rulesIntersection } from "./rules/rules.js"
import { resolvePredicateIfIdentifier } from "./utils.js"

export type Predicate<
    domain extends Domain = Domain,
    scope extends Dictionary = Dictionary
> = CollapsibleList<Condition<domain, scope>>

export type Condition<
    domain extends Domain = Domain,
    scope extends Dictionary = Dictionary
> = true | RuleSet<domain, scope> | ExactValue<domain> | Identifier<scope>

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
    l: Predicate,
    r: Predicate,
    context: PredicateContext
): PredicateComparison => {
    const lResolution = resolvePredicateIfIdentifier(
        context.domain,
        l,
        context.scope
    )
    const rResolution = resolvePredicateIfIdentifier(
        context.domain,
        l,
        context.scope
    )
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
    }
    const lComparisons = listFrom(l)
    const rComparisons = listFrom(r)
    const comparison = compareConditions(listFrom(l), listFrom(r), context)
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

type PredicateComparison = SetOperationResult<Predicate> | ConditionsComparison

export const isConditionsComparison = (
    comparison: PredicateComparison
): comparison is ConditionsComparison =>
    (comparison as ConditionsComparison)?.intersections !== undefined

type ConditionsComparison = {
    lSubconditionsOfR: number[]
    rSubconditionsOfL: number[]
    equalPairs: [lIndex: number, rIndex: number][]
    intersections: List<Condition>
}

const compareConditions = (
    lConditions: List<Condition>,
    rConditions: List<Condition>,
    context: PredicateContext
): ConditionsComparison => {
    const result: ConditionsComparison = {
        intersections: [],
        lSubconditionsOfR: [],
        rSubconditionsOfL: [],
        equalPairs: []
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
            const keyResult = conditionIntersection(l, r, context)
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

export const compareConditions = (
    l: Condition,
    r: Condition,
    context: PredicateContext
) => {
    const lResolution =
        typeof l === "string"
            ? context.scope.resolveToDomain(l, context.domain)
            : l
    const rResolution =
        typeof r === "string"
            ? context.scope.resolveToDomain(r, context.domain)
            : r
    return isExactValue(lResolution)
        ? isExactValue(rResolution)
            ? lResolution.value === rResolution.value
                ? equal
                : empty
            : checkRules(lResolution.value, rResolution, context)
            ? l
            : empty
        : isExactValue(rResolution)
        ? checkRules(rResolution.value, lResolution, context)
            ? r
            : empty
        : rulesIntersection(lResolution, rResolution, context)
}
