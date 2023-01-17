import type { ScopeRoot } from "../scope.ts"
import { checkRules } from "../traverse/check.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { hasSubdomain } from "../utils/domains.ts"
import type { CollapsibleList, Dict, stringKeyOf } from "../utils/generics.ts"
import { collapseIfSingleton, listFrom } from "../utils/generics.ts"
import type { BranchesComparison } from "./branches.ts"
import { compareBranches, isBranchComparison } from "./branches.ts"
import type {
    KeyReducerFn,
    OperationContext,
    SetOperationResult
} from "./compose.ts"
import { disjoint, equality } from "./compose.ts"
import type {
    DiscriminatableRule,
    DiscriminatedBranches
} from "./discriminate.ts"
import type { Identifier, ValidatorNode } from "./node.ts"
import {
    isExactValuePredicate,
    resolveFlatPredicate,
    resolvePredicateIfIdentifier
} from "./resolve.ts"
import type { RuleSet, TraversalRuleEntry } from "./rules/rules.ts"
import { compileRules, rulesIntersection } from "./rules/rules.ts"

export type Predicate<domain extends Domain = Domain, $ = Dict> = Dict extends $
    ? true | CollapsibleList<Condition>
    : true | CollapsibleList<Condition<domain, $>>

export type TraversalPredicate =
    | TraversalCondition
    | [TraversalBranchesEntry]
    | [DiscriminatedTraversalBranchesEntry]

export type TraversalBranchesEntry = ["branches", readonly TraversalCondition[]]

export type DiscriminatedTraversalBranchesEntry<
    rule extends DiscriminatableRule = DiscriminatableRule
> = ["cases", DiscriminatedBranches<rule>]

export const compilePredicate = (
    domain: Domain,
    predicate: Predicate,
    $: ScopeRoot
): TraversalPredicate => {
    if (predicate === true) {
        return []
    }
    const branches = listFrom(predicate)
    const flatBranches: TraversalCondition[] = []
    for (const condition of branches) {
        if (typeof condition === "string") {
            flatBranches.push(
                ...branchesOf(resolveFlatPredicate(condition, domain, $))
            )
        } else if (isExactValuePredicate(condition)) {
            flatBranches.push([["value", condition.value]])
        } else {
            flatBranches.push(compileRules(condition, $))
        }
    }
    if (flatBranches.length === 1) {
        return flatBranches[0]
    }
    if (domain === "object") {
        return [
            [
                "cases",
                {
                    path: [],
                    rule: "domain",
                    cases: {}
                }
            ]
        ]
    }
    return [["branches", flatBranches]]
}

const branchesOf = (flatPredicate: TraversalPredicate) =>
    (flatPredicate[0][0] === "branches"
        ? flatPredicate.slice(1)
        : [flatPredicate]) as TraversalCondition[]

export type Condition<domain extends Domain = Domain, $ = Dict> =
    | RuleSet<domain, $>
    | ExactValue<domain>
    | Identifier<$>

export type TraversalCondition =
    | readonly TraversalRuleEntry[]
    | [ExactValueEntry]

export type ExactValue<domain extends Domain = Domain> = {
    readonly value: inferDomain<domain>
}

export type ExactValueEntry = ["value", unknown]

export type ResolvedPredicate<
    domain extends Domain = Domain,
    $ = Dict
> = Exclude<Predicate<domain, stringKeyOf<$>>, string>

export type PredicateComparison =
    | SetOperationResult<Predicate>
    | BranchesComparison

export const comparePredicates = (
    domain: Domain,
    l: Predicate,
    r: Predicate,
    context: OperationContext
): PredicateComparison => {
    const lResolution = resolvePredicateIfIdentifier(domain, l, context.$)
    const rResolution = resolvePredicateIfIdentifier(domain, r, context.$)
    if (lResolution === true) {
        return rResolution === true ? equality() : r
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
                    ? equality()
                    : disjoint(
                          "value",
                          lResolution.value,
                          rResolution.value,
                          context
                      )
                : checkRules(domain, lResolution.value, rResolution, context)
                ? l
                : // TODO: fix
                  disjoint("value", lResolution.value, "temp", context)
            : isExactValuePredicate(rResolution)
            ? checkRules(domain, rResolution.value, lResolution, context)
                ? r
                : disjoint("value", "temp", rResolution.value, context)
            : rulesIntersection(lResolution, rResolution, context)
    }
    const lComparisons = listFrom(lResolution)
    const rComparisons = listFrom(rResolution)
    const comparison = compareBranches(
        domain,
        lComparisons,
        rComparisons,
        context
    )
    if (
        comparison.equalities.length === lComparisons.length &&
        comparison.equalities.length === rComparisons.length
    ) {
        return equality()
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

export const predicateIntersection: KeyReducerFn<Required<ValidatorNode>> = (
    domain,
    l,
    r,
    context
) => {
    const comparison = comparePredicates(domain, l, r, context)
    if (!isBranchComparison(comparison)) {
        return comparison
    }
    return collapseIfSingleton([
        ...comparison.distinctIntersections,
        ...comparison.equalities.map(
            (indices) => comparison.lConditions[indices[0]]
        ),
        ...comparison.lSubconditionsOfR.map(
            (lIndex) => comparison.lConditions[lIndex]
        ),
        ...comparison.rSubconditionsOfL.map(
            (rIndex) => comparison.rConditions[rIndex]
        )
    ])
}

export const predicateUnion: KeyReducerFn<Required<ValidatorNode>> = (
    domain,
    l,
    r,
    context
) => {
    const comparison = comparePredicates(domain, l, r, context)
    if (!isBranchComparison(comparison)) {
        return comparison === l
            ? r
            : comparison === r
            ? l
            : // If a boolean has multiple branches, neither of which is a
            // subtype of the other, it consists of two opposite literals
            // and can be simplified to a non-literal boolean.
            domain === "boolean"
            ? true
            : ([l, r] as Condition[])
    }
    return collapseIfSingleton([
        ...comparison.lConditions.filter(
            (_, lIndex) =>
                !comparison.lSubconditionsOfR.includes(lIndex) &&
                !comparison.equalities.some(
                    (indexPair) => indexPair[0] === lIndex
                )
        ),
        ...comparison.rConditions.filter(
            (_, rIndex) =>
                !comparison.rSubconditionsOfL.includes(rIndex) &&
                !comparison.equalities.some(
                    (indexPair) => indexPair[1] === rIndex
                )
        )
    ])
}
