import type { ScopeRoot } from "../scope.js"
import {
    coalesceBranches,
    composeKeyedOperation,
    composeNodeOperation,
    equal,
    finalizeNodeOperation
} from "./compose.js"
import type { TypeNode, TypeSet } from "./node.js"
import { comparePredicates, isConditionsComparison } from "./predicate.js"

export const intersection = (
    l: TypeNode,
    r: TypeNode,
    scope: ScopeRoot
): TypeNode => finalizeNodeOperation(l, nodeIntersection(l, r, scope))

const typeSetIntersection = composeKeyedOperation<TypeSet, ScopeRoot>(
    (domain, l, r, scope) => {
        if (l === undefined) {
            return r === undefined ? equal : undefined
        }
        if (r === undefined) {
            return undefined
        }
        const comparison = comparePredicates(l, r, {
            domain,
            scope
        })
        if (!isConditionsComparison(comparison)) {
            return comparison
        }
        const finalBranches = [
            ...comparison.intersections,
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
)

export const nodeIntersection = composeNodeOperation(typeSetIntersection)
