import type { Type } from "../scopes/type.js"
import type { Domain } from "../utils/domains.js"
import type { CollapsibleList, Dict } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import { isArray } from "../utils/objectKinds.js"
import type { Branch, Branches, BranchesComparison } from "./branch.js"
import {
    branchIntersection,
    compareBranches,
    flattenBranch,
    isBranchComparison
} from "./branch.js"
import type { IntersectionResult, KeyIntersectionFn } from "./compose.js"
import { equality, IntersectionState, isEquality } from "./compose.js"
import { flattenBranches } from "./discriminate.js"
import type { FlattenContext, TraversalEntry, TypeNode } from "./node.js"
import type { LiteralRules } from "./rules/rules.js"

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type Predicate<
    domain extends Domain = Domain,
    $ = Dict
> = string extends keyof $
    ? true | CollapsibleList<Branch>
    : true | CollapsibleList<Branch<domain, $>>

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
    if (!isArray(l) && !isArray(r)) {
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

export const predicateIntersection: KeyIntersectionFn<Required<TypeNode>> = (
    domain,
    l,
    r,
    state
) => {
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
    return isArray(predicate)
        ? flattenBranches(predicate, context)
        : flattenBranch(predicate, context)
}

export const isLiteralCondition = (
    predicate: Predicate
): predicate is LiteralRules =>
    typeof predicate === "object" && "value" in predicate
