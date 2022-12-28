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
import type { Condition } from "./predicate.ts"
import { comparePredicates } from "./predicate.ts"

export const union = (l: TypeNode, r: TypeNode, scope: Scope) =>
    finalizeNodeOperation(l, nodeUnion(l, r, scope))

export const predicateUnion: KeyReducerFn<Required<TypeSet>, Scope> = (
    domain,
    l,
    r,
    scope
) => {
    const comparison = comparePredicates(domain, l, r, scope)
    if (!isBranchComparison(comparison)) {
        return comparison === l
            ? r
            : comparison === r
            ? l
            : // If a boolean has multiple branches, neither of which is a
            // subtype of the other, it consists of two opposite literals
            // and can be simplified to a non-literal boolean.
            domain === "boolean"
            ? true
            : ([l, r] as Condition[])
    }
    return collapseIfSingleton([
        ...comparison.lConditions.filter(
            (_, lIndex) =>
                !comparison.lSubconditionsOfR.includes(lIndex) &&
                !comparison.equalities.some(
                    (indexPair) => indexPair[0] === lIndex
                )
        ),
        ...comparison.rConditions.filter(
            (_, rIndex) =>
                !comparison.rSubconditionsOfL.includes(rIndex) &&
                !comparison.equalities.some(
                    (indexPair) => indexPair[1] === rIndex
                )
        )
    ])
}

export const typeSetUnion = composeKeyedOperation<TypeSet, Scope>(
    (domain, l, r, scope) => {
        if (l === undefined) {
            return r === undefined ? equal : r
        }
        if (r === undefined) {
            return l
        }
        return predicateUnion(domain, l, r, scope)
    },
    { onEmpty: "throw" }
)

export const nodeUnion = composeNodeOperation(typeSetUnion)
