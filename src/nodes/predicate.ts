import type { ScopeRoot } from "../scope.js"
import { checkRules } from "../traverse/check.js"
import type { Domain, inferDomain } from "../utils/domains.js"
import { hasSubdomain } from "../utils/domains.js"
import type { CollapsibleList, Dict } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { BranchesComparison } from "./branches.js"
import { compareBranches } from "./branches.js"
import type { SetOperationResult } from "./compose.js"
import { empty, equal } from "./compose.js"
import type { Identifier } from "./node.js"
import type { RuleSet, TraversalRuleEntry } from "./rules/rules.js"
import { compileRules, rulesIntersection } from "./rules/rules.js"
import { isExactValuePredicate, resolvePredicateIfIdentifier } from "./utils.js"

export type Predicate<
    domain extends Domain = Domain,
    scope extends Dict = Dict
> = string extends keyof scope
    ? true | CollapsibleList<Condition>
    : true | CollapsibleList<Condition<domain, scope>>

export type TraversalPredicate = TraversalCondition | [TraversalBranchesEntry]

export type TraversalBranchesEntry = ["branches", readonly TraversalCondition[]]

export const compilePredicate = (
    domain: Domain,
    predicate: Predicate,
    scope: ScopeRoot
): TraversalPredicate => {
    if (predicate === true) {
        return []
    }
    const branches = listFrom(predicate)
    const flatBranches: TraversalCondition[] = []
    for (const condition of branches) {
        if (typeof condition === "string") {
            flatBranches.push(
                ...branchesOf(scope.resolveFlatPredicate(condition, domain))
            )
        } else if (isExactValuePredicate(condition)) {
            flatBranches.push([["value", condition.value]])
        } else {
            flatBranches.push(compileRules(condition, scope))
        }
    }
    return flatBranches.length === 1
        ? flatBranches[0]
        : [["branches", flatBranches]]
}

const branchesOf = (flatPredicate: TraversalPredicate) =>
    (flatPredicate[0][0] === "branches"
        ? flatPredicate.slice(1)
        : [flatPredicate]) as TraversalCondition[]

export type Condition<
    domain extends Domain = Domain,
    scope extends Dict = Dict
> = RuleSet<domain, scope> | ExactValue<domain> | Identifier<scope>

export type TraversalCondition =
    | readonly TraversalRuleEntry[]
    | [ExactValueEntry]

export type ExactValue<domain extends Domain = Domain> = {
    readonly value: inferDomain<domain>
}

export type ExactValueEntry = ["value", unknown]

export type PredicateContext = {
    domain: Domain
    scope: ScopeRoot
}

export type ResolvedPredicate<
    domain extends Domain = Domain,
    scope extends Dict = Dict
> = Exclude<Predicate<domain, scope>, string>

export type PredicateComparison =
    | SetOperationResult<Predicate>
    | BranchesComparison

export const comparePredicates = (
    domain: Domain,
    l: Predicate,
    r: Predicate,
    scope: ScopeRoot
): PredicateComparison => {
    const lResolution = resolvePredicateIfIdentifier(domain, l, scope)
    const rResolution = resolvePredicateIfIdentifier(domain, r, scope)
    if (lResolution === true) {
        return rResolution === true ? equal : r
    }
    if (rResolution === true) {
        return l
    }
    if (
        hasSubdomain(lResolution, "object") &&
        hasSubdomain(rResolution, "object")
    ) {
        return isExactValuePredicate(lResolution)
            ? isExactValuePredicate(rResolution)
                ? lResolution.value === rResolution.value
                    ? equal
                    : empty
                : checkRules(domain, lResolution.value, rResolution, scope)
                ? l
                : empty
            : isExactValuePredicate(rResolution)
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
    if (
        comparison.equalities.length === lComparisons.length &&
        comparison.equalities.length === rComparisons.length
    ) {
        return equal
    }
    if (
        comparison.lSubconditionsOfR.length + comparison.equalities.length ===
        lComparisons.length
    ) {
        return l
    }
    if (
        comparison.rSubconditionsOfL.length + comparison.equalities.length ===
        rComparisons.length
    ) {
        return r
    }
    return comparison
}
