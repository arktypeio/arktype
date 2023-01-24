import type { Morph } from "../parse/tuple/morph.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { hasSubdomain } from "../utils/domains.ts"
import type { CollapsibleList, Dict, xor } from "../utils/generics.ts"
import { collapseIfSingleton, listFrom } from "../utils/generics.ts"
import type { Branches, BranchesComparison } from "./branches.ts"
import { compareBranches, isBranchComparison } from "./branches.ts"
import type {
    IntersectionContext,
    IntersectionResult,
    Intersector,
    KeyIntersectionFn
} from "./compose.ts"
import { equality, isEquality } from "./compose.ts"
import { compileBranches } from "./discriminate.ts"
import type { TraversalEntry, TypeResolution } from "./node.ts"
import { initializeIntersectionContext } from "./node.ts"
import type { Rules } from "./rules/rules.ts"
import { compileRules, rulesIntersection } from "./rules/rules.ts"

export type Predicate<domain extends Domain = Domain, $ = Dict> = Dict extends $
    ? true | CollapsibleList<Branch>
    : true | CollapsibleList<Branch<domain, $>>

export type Branch<domain extends Domain = Domain, $ = Dict> = xor<
    Rules<domain, $>,
    {
        input: Rules<domain, $>
        morph: CollapsibleList<Morph>
    }
>

export type PredicateComparison =
    | IntersectionResult<Predicate>
    | BranchesComparison

export const comparePredicates = (
    domain: Domain,
    l: Predicate,
    r: Predicate,
    context: IntersectionContext
): PredicateComparison => {
    if (l === true) {
        return r === true ? equality() : r
    }
    if (r === true) {
        return l
    }
    if (hasSubdomain(l, "object") && hasSubdomain(r, "object")) {
        const result = rulesIntersection(l, r, context)
        return result === l ? l : result === r ? r : result
    }
    const lComparisons = listFrom(l) as Branches
    const rComparisons = listFrom(r) as Branches
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

export const predicateIntersection: KeyIntersectionFn<
    Required<TypeResolution>
> = (domain, l, r, context) => {
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

// TODO: fix premature removal of morph branches.
export const predicateUnion = (
    domain: Domain,
    l: Predicate,
    r: Predicate,
    $: ScopeRoot
) => {
    const context = initializeIntersectionContext($)
    const comparison = comparePredicates(domain, l, r, context)
    if (!isBranchComparison(comparison)) {
        return isEquality(comparison) || comparison === l
            ? r
            : comparison === r
            ? l
            : // if a boolean has multiple branches, neither of which is a
            // subtype of the other, it consists of two opposite literals
            // and can be simplified to a non-literal boolean.
            domain === "boolean"
            ? true
            : ([l, r] as Rules[])
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

export const compilePredicate = (
    predicate: Predicate,
    $: ScopeRoot
): TraversalEntry[] => {
    if (predicate === true) {
        return []
    }
    return hasSubdomain(predicate, "Array")
        ? compileBranches(predicate, $)
        : compileRules(predicate, $)
}
