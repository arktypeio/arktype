import type { Type } from "../main.ts"
import type { Morph } from "../parse/tuple/morph.ts"
import type { Domain } from "../utils/domains.ts"
import { hasSubdomain } from "../utils/domains.ts"
import type { CollapsibleList, defined, Dict, xor } from "../utils/generics.ts"
import { keysOf, listFrom } from "../utils/generics.ts"
import type { Branches, BranchesComparison } from "./branches.ts"
import { compareBranches, isBranchComparison } from "./branches.ts"
import type { IntersectionResult, KeyIntersectionFn } from "./compose.ts"
import { equality, IntersectionState, isEquality } from "./compose.ts"
import { flattenBranches } from "./discriminate.ts"
import type { FlattenContext, ResolvedNode, TraversalEntry } from "./node.ts"
import type { LiteralRules, Rules } from "./rules/rules.ts"
import { branchIntersection, flattenBranch } from "./rules/rules.ts"

export type Predicate<
    domain extends Domain = Domain,
    $ = Dict
> = string extends keyof $
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

const emptyRulesIfTrue = <predicate extends Predicate>(predicate: predicate) =>
    (predicate === true ? {} : predicate) as Exclude<predicate, true>

export const comparePredicates = (
    l: Predicate,
    r: Predicate,
    context: IntersectionState
): PredicateComparison => {
    if (l === true && r === true) {
        return equality()
    }
    if (!hasSubdomain(l, "Array") && !hasSubdomain(r, "Array")) {
        const result = branchIntersection(
            emptyRulesIfTrue(l),
            emptyRulesIfTrue(r),
            context
        )
        return result === l ? l : result === r ? r : result
    }
    const lBranches: Branches = listFrom(emptyRulesIfTrue(l))
    const rBranches: Branches = listFrom(emptyRulesIfTrue(r))
    const comparison = compareBranches(lBranches, rBranches, context)
    if (
        comparison.equalities.length === lBranches.length &&
        comparison.equalities.length === rBranches.length
    ) {
        return equality()
    }
    if (
        comparison.lExtendsR.length + comparison.equalities.length ===
        lBranches.length
    ) {
        return l
    }
    if (
        comparison.rExtendsL.length + comparison.equalities.length ===
        rBranches.length
    ) {
        return r
    }
    return comparison
}

export const predicateIntersection: KeyIntersectionFn<
    Required<ResolvedNode>
> = (domain, l, r, state) => {
    state.domain = domain
    const comparison = comparePredicates(l, r, state)
    if (!isBranchComparison(comparison)) {
        return comparison
    }
    const resultBranches = [
        ...comparison.distinctIntersections,
        ...comparison.equalities.map(
            (indices) => comparison.lBranches[indices[0]]
        ),
        ...comparison.lExtendsR.map((lIndex) => comparison.lBranches[lIndex]),
        ...comparison.rExtendsL.map((rIndex) => comparison.rBranches[rIndex])
    ]
    if (resultBranches.length === 0) {
        state.addDisjoint("union", comparison.lBranches, comparison.rBranches)
    }
    return resultBranches.length === 1 ? resultBranches[0] : resultBranches
}

export const predicateUnion = (
    domain: Domain,
    l: Predicate,
    r: Predicate,
    type: Type
) => {
    const state = new IntersectionState(type, "|")
    const comparison = comparePredicates(l, r, state)
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
            : ([emptyRulesIfTrue(l), emptyRulesIfTrue(r)] as [Branch, Branch])
    }
    const resultBranches = [
        ...comparison.lBranches.filter(
            (_, lIndex) =>
                !comparison.lExtendsR.includes(lIndex) &&
                !comparison.equalities.some(
                    (indexPair) => indexPair[0] === lIndex
                )
        ),
        ...comparison.rBranches.filter(
            (_, rIndex) =>
                !comparison.rExtendsL.includes(rIndex) &&
                !comparison.equalities.some(
                    (indexPair) => indexPair[1] === rIndex
                )
        )
    ]
    return resultBranches.length === 1 ? resultBranches[0] : resultBranches
}

export const flattenPredicate = (
    predicate: Predicate,
    context: FlattenContext
): TraversalEntry[] => {
    if (predicate === true) {
        return []
    }
    return hasSubdomain(predicate, "Array")
        ? flattenBranches(predicate, context)
        : flattenBranch(predicate, context)
}

export const isLiteralCondition = (
    predicate: Predicate
): predicate is LiteralRules =>
    typeof predicate === "object" && "value" in predicate

export type DomainSubtypeResolution<domain extends Domain> = {
    readonly [k in domain]: defined<ResolvedNode[domain]>
}

export const resolutionExtendsDomain = <domain extends Domain>(
    resolution: ResolvedNode,
    domain: domain
): resolution is DomainSubtypeResolution<domain> => {
    const domains = keysOf(resolution)
    return domains.length === 1 && domains[0] === domain
}
