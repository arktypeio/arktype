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

export const union = (l: TypeNode, r: TypeNode, scope: ScopeRoot) =>
    finalizeNodeOperation(l, nodeUnion(l, r, scope))

export const typeSetUnion = composeKeyedOperation<TypeSet, ScopeRoot>(
    (domain, l, r, scope) => {
        if (l === undefined) {
            return r === undefined ? equal : r
        }
        if (r === undefined) {
            return l
        }
        const comparison = comparePredicates(l, r, {
            domain,
            scope
        })
        if (!isConditionsComparison(comparison)) {
            return comparison === l ? r : l
        }
        const finalBranches = [
            ...comparison.lConditions.filter(
                (_, lIndex) =>
                    !comparison.lSubconditionsOfR.includes(lIndex) &&
                    !comparison.equal.some(
                        (indexPair) => indexPair[0] === lIndex
                    )
            ),
            ...comparison.rConditions.filter(
                (_, rIndex) =>
                    !comparison.rSubconditionsOfL.includes(rIndex) &&
                    !comparison.equal.some(
                        (indexPair) => indexPair[1] === rIndex
                    )
            )
        ]
        return coalesceBranches(domain, finalBranches)
    }
)

export const nodeUnion = composeNodeOperation(typeSetUnion)
