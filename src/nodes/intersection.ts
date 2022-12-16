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

export const intersection = (
    l: TypeNode,
    r: TypeNode,
    scope: ScopeRoot
): TypeNode => finalizeNodeOperation(l, nodeIntersection(l, r, scope))

export const predicateIntersection: KeyReducerFn<
    Required<TypeSet>,
    ScopeRoot
> = (domain, l, r, scope) => {
    const comparison = comparePredicates(domain, l, r, scope)
    if (!isBranchComparison(comparison)) {
        return comparison
    }
    const finalBranches = [
        ...comparison.codependentIntersections,
        ...comparison.equalPairs.map(
            (indices) => comparison.lConditions[indices[0]]
        ),
        ...comparison.lSubconditionsOfR.map(
            (lIndex) => comparison.lConditions[lIndex]
        ),
        ...comparison.rSubconditionsOfL.map(
            (rIndex) => comparison.rConditions[rIndex]
        )
    ]
    return coalesceBranches(domain, finalBranches)
}

const typeSetIntersection = composeKeyedOperation<TypeSet, ScopeRoot>(
    (domain, l, r, scope) => {
        if (l === undefined) {
            return r === undefined ? equal : undefined
        }
        if (r === undefined) {
            return undefined
        }
        return predicateIntersection(domain, l, r, scope)
    }
)

export const nodeIntersection = composeNodeOperation(typeSetIntersection)
