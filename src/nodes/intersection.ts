import type { Scope } from "../scope.ts"
import { collapseIfSingleton } from "../utils/generics.ts"
import { isBranchComparison } from "./branches.ts"
import type { KeyReducerFn } from "./compose.ts"
import {
    composeKeyedOperation,
    composeNodeOperation,
    equal,
    finalizeNodeOperation
} from "./compose.ts"
import type { TypeNode, TypeSet } from "./node.ts"
import { comparePredicates } from "./predicate.ts"

export const intersection = (
    l: TypeNode,
    r: TypeNode,
    scope: Scope
): TypeNode => finalizeNodeOperation(l, nodeIntersection(l, r, scope))

export const predicateIntersection: KeyReducerFn<Required<TypeSet>, Scope> = (
    domain,
    l,
    r,
    scope
) => {
    const comparison = comparePredicates(domain, l, r, scope)
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

const typeSetIntersection = composeKeyedOperation<TypeSet, Scope>(
    (domain, l, r, scope) => {
        if (l === undefined) {
            return r === undefined ? equal : undefined
        }
        if (r === undefined) {
            return undefined
        }
        return predicateIntersection(domain, l, r, scope)
    },
    { onEmpty: "delete" }
)

export const nodeIntersection = composeNodeOperation(typeSetIntersection)
