import type { ScopeRoot } from "../scope.js"
import type { ObjectSubdomain } from "../utils/domainOf.js"
import { hasKey } from "../utils/generics.js"
import { boundsIntersection } from "./bounds.js"
import { checkConstraints } from "./check.js"
import type { PredicateContext } from "./compare.js"
import { comparePredicates, isBranchesComparison } from "./compare.js"
import type { SetOperation } from "./compose.js"
import {
    coalesceBranches,
    composeKeyedOperation,
    composeNodeOperation,
    composePredicateIntersection,
    empty,
    equal,
    finalizeNodeOperation
} from "./compose.js"
import { divisorIntersection } from "./divisor.js"
import type {
    resolved,
    TypeNode,
    UnknownBranch,
    UnknownConstraints,
    UnknownDomain
} from "./node.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"
import { collapsibleKeysetIntersection } from "./regex.js"

export const intersection = (
    l: TypeNode,
    r: TypeNode,
    scope: ScopeRoot
): TypeNode => finalizeNodeOperation(l, nodeIntersection(l, r, scope))

const domainsIntersection = composeKeyedOperation<UnknownDomain, ScopeRoot>(
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
        if (!isBranchesComparison(comparison)) {
            return comparison
        }
        const finalBranches = [
            ...comparison.intersections,
            ...comparison.equalities.map(
                (indices) => comparison.lRules[indices[0]]
            ),
            ...comparison.lSubrulesOfR.map(
                (lIndex) => comparison.lRules[lIndex]
            ),
            ...comparison.rSubrulesOfL.map(
                (rIndex) => comparison.rRules[rIndex]
            )
        ]
        return coalesceBranches(domain, finalBranches)
    }
)

export const nodeIntersection = composeNodeOperation(domainsIntersection)

export const branchResolutionIntersection: SetOperation<
    resolved<UnknownBranch>,
    PredicateContext
> = (l, r, context) =>
    hasKey(l, "value")
        ? hasKey(r, "value")
            ? l.value === r.value
                ? equal
                : empty
            : checkConstraints(l.value, r, context)
            ? l
            : empty
        : hasKey(r, "value")
        ? checkConstraints(r.value, l, context)
            ? r
            : empty
        : attributesIntersection(l, r, context)

export const subtypeIntersection =
    composePredicateIntersection<ObjectSubdomain>((l, r) =>
        l === r ? equal : empty
    )

const attributesIntersection = composeKeyedOperation<
    UnknownConstraints,
    PredicateContext
>(
    {
        kind: subtypeIntersection,
        divisor: divisorIntersection,
        regex: collapsibleKeysetIntersection,
        props: propsIntersection,
        requiredKeys: requiredKeysIntersection,
        propTypes: propsIntersection,
        bounds: boundsIntersection
    },
    { propagateEmpty: true }
)
