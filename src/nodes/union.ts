import type { ScopeRoot } from "../scope.js"
import type { KeyReducerFn } from "./compose.js"
import {
    coalesceBranches,
    composeKeyedOperation,
    composeNodeOperation,
    equal,
    finalizeNodeOperation
} from "./compose.js"
import type { TypeNode, TypeSet } from "./node.js"
import { comparePredicates, isBranchComparison } from "./predicate.js"

export const union = (l: TypeNode, r: TypeNode, scope: ScopeRoot) =>
    finalizeNodeOperation(l, nodeUnion(l, r, scope))

// TODO: Add reduce branches of union function that acts on branch comparison result
// E.g. coalesceUnion(comparison). Similar for intersection

export const predicateUnion: KeyReducerFn<Required<TypeSet>, ScopeRoot> = (
    domain,
    l,
    r,
    scope
) => {
    const comparison = comparePredicates(domain, l, r, scope)
    if (!isBranchComparison(comparison)) {
        // Unequal?
        return comparison === l ? r : l
    }
    const finalBranches = [
        ...comparison.lConditions.filter(
            (_, lIndex) =>
                !comparison.lSubconditionsOfR.includes(lIndex) &&
                !comparison.equalPairs.some(
                    (indexPair) => indexPair[0] === lIndex
                )
        ),
        ...comparison.rConditions.filter(
            (_, rIndex) =>
                !comparison.rSubconditionsOfL.includes(rIndex) &&
                !comparison.equalPairs.some(
                    (indexPair) => indexPair[1] === rIndex
                )
        )
    ]
    return coalesceBranches(domain, finalBranches)
}

export const typeSetUnion = composeKeyedOperation<TypeSet, ScopeRoot>(
    (domain, l, r, scope) => {
        if (l === undefined) {
            return r === undefined ? equal : r
        }
        if (r === undefined) {
            return l
        }
        return predicateUnion(domain, l, r, scope)
    }
)

export const nodeUnion = composeNodeOperation(typeSetUnion)
