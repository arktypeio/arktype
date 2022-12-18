import type { ScopeRoot } from "../scope.js"
import { collapseIfSingleton } from "../utils/generics.js"
import { isBranchComparison } from "./branches.js"
import type { KeyReducerFn } from "./compose.js"
import {
    composeKeyedOperation,
    composeNodeOperation,
    equal,
    finalizeNodeOperation
} from "./compose.js"
import type { TypeNode, TypeSet } from "./node.js"
import type { Condition } from "./predicate.js"
import { comparePredicates } from "./predicate.js"

export const union = (l: TypeNode, r: TypeNode, scope: ScopeRoot) =>
    finalizeNodeOperation(l, nodeUnion(l, r, scope))

export const predicateUnion: KeyReducerFn<Required<TypeSet>, ScopeRoot> = (
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
    ])
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
    },
    { onEmpty: "throw" }
)

export const nodeUnion = composeNodeOperation(typeSetUnion)
