import type { Type } from "../scopes/type.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf, hasDomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { CollapsibleList, Dict } from "../utils/generics.ts"
import { listFrom } from "../utils/generics.ts"
import { isArray } from "../utils/objectKinds.ts"
import type { Branch, Branches, BranchesComparison } from "./branch.ts"
import {
    branchIntersection,
    compareBranches,
    compileBranch,
    isBranchComparison
} from "./branch.ts"
import type { Compilation } from "./compile.ts"
import type { IntersectionResult, KeyIntersectionFn } from "./compose.ts"
import {
    BaseNode,
    equality,
    IntersectionState,
    isDisjoint,
    isEquality
} from "./compose.ts"
import { compileBranches } from "./discriminate.ts"
import type { DomainsNode } from "./node.ts"
import type { LiteralRules } from "./rules/rules.ts"

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type Predicate<
    domain extends Domain = Domain,
    $ = Dict
> = string extends keyof $
    ? true | CollapsibleList<Branch>
    : true | CollapsibleList<Branch<domain, $>>

export class DomainNode<domain extends Domain = Domain> extends BaseNode<
    Branch<domain>[]
> {
    intersection(
        node: this,
        state: IntersectionState
    ): IntersectionResult<this> {
        // TODO: Fix
        // state.domain = domain
        const comparison = this.compare(node, state)
        const resultBranches = [
            ...comparison.distinctIntersections,
            ...comparison.equalities.map(
                (indices) => comparison.lBranches[indices[0]]
            ),
            ...comparison.lExtendsR.map(
                (lIndex) => comparison.lBranches[lIndex]
            ),
            ...comparison.rExtendsL.map(
                (rIndex) => comparison.rBranches[rIndex]
            )
        ]
        if (resultBranches.length === 0) {
            state.addDisjoint(
                "union",
                comparison.lBranches,
                comparison.rBranches
            )
        }
        return resultBranches.length === 1 ? resultBranches[0] : resultBranches
    }

    union(node: this, type: Type) {
        const state = new IntersectionState(type, "|")
        const comparison = this.compare(node, state)
        if (!isBranchComparison(comparison)) {
            // return isEquality(comparison) || comparison === l
            //     ? r
            //     : comparison === r
            //     ? l
            //     : // if a boolean has multiple branches, neither of which is a
            //     // subtype of the other, it consists of two opposite literals
            //     // and can be simplified to a non-literal boolean.
            //     domain === "boolean"
            //     ? true
            //     : ([emptyRulesIfTrue(l), emptyRulesIfTrue(r)] as [
            //           Branch,
            //           Branch
            //       ])
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

    compare(predicate: this, state: IntersectionState) {
        // TODO: could this be renamed to subtypes/supertypes relative to the
        // current instance?
        const result: BranchesComparison = {
            lExtendsR: [],
            rExtendsL: [],
            equalities: [],
            distinctIntersections: []
        }
        const pairs = predicate.def.map((condition) => ({
            condition,
            distinct: [] as Branch[] | null
        }))
        this.def.forEach((l, lIndex) => {
            let lImpliesR = false
            const distinct = pairs.map((rPairs, rIndex): Branch | null => {
                if (lImpliesR || !rPairs.distinct) {
                    return null
                }
                const r = rPairs.condition
                const subresult = branchIntersection(l, r, state)
                if (isDisjoint(subresult)) {
                    // doesn't tell us about any redundancies or add a distinct pair
                    return null
                } else if (subresult === l) {
                    result.lExtendsR.push(lIndex)
                    // If l is a subtype of the current r branch, intersections
                    // with the remaining branches of r won't lead to distinct
                    // branches, so we set a flag indicating we can skip them.
                    lImpliesR = true
                    return null
                } else if (subresult === r) {
                    result.rExtendsL.push(rIndex)
                    // If r is a subtype of the current l branch, it is removed
                    // from pairsByR because future intersections won't lead to
                    // distinct branches.
                    rPairs.distinct = null
                    return null
                } else if (isEquality(subresult)) {
                    // Combination of l and r subtype cases.
                    result.equalities.push([lIndex, rIndex])
                    lImpliesR = true
                    rPairs.distinct = null
                    return null
                } else if (hasDomain(subresult, "object")) {
                    // Neither branch is a subtype of the other, return
                    // the result of the intersection as a candidate
                    // branch for the final union
                    return subresult
                }
                return throwInternalError(
                    `Unexpected predicate intersection result of type '${domainOf(
                        subresult
                    )}'`
                )
            })
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
}

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

export const predicateIntersection: KeyIntersectionFn<Required<DomainsNode>> = (
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

export const compilePredicate = (
    predicate: Predicate,
    c: Compilation
): string => {
    if (predicate === true) {
        return ""
    }
    return isArray(predicate)
        ? compileBranches(predicate, c)
        : compileBranch(predicate, c)
}

export const isLiteralCondition = (
    predicate: Predicate
): predicate is LiteralRules =>
    typeof predicate === "object" && "value" in predicate
