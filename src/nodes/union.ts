import type { ScopeRoot } from "../scope.js"
import { comparePredicates, isBranchesComparison } from "./compare.js"
import {
    coalesceBranches,
    composeKeyedOperation,
    composeNodeOperation,
    equal,
    finalizeNodeOperation
} from "./compose.js"
import type { TypeNode, UnknownDomainNode } from "./node.js"

export const union = (l: TypeNode, r: TypeNode, scope: ScopeRoot) =>
    finalizeNodeOperation(l, nodeUnion(l, r, scope))

export const domainsUnion = composeKeyedOperation<UnknownDomainNode, ScopeRoot>(
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
        if (!isBranchesComparison(comparison)) {
            return comparison === l ? r : l
        }
        const finalBranches = [
            ...comparison.lRules.filter(
                (_, lIndex) =>
                    !comparison.lSubrulesOfR.includes(lIndex) &&
                    !comparison.equalities.some(
                        (indexPair) => indexPair[0] === lIndex
                    )
            ),
            ...comparison.rRules.filter(
                (_, rIndex) =>
                    !comparison.rSubrulesOfL.includes(rIndex) &&
                    !comparison.equalities.some(
                        (indexPair) => indexPair[1] === rIndex
                    )
            )
        ]
        return coalesceBranches(domain, finalBranches)
    }
)

export const nodeUnion = composeNodeOperation(domainsUnion)
