import type { ScopeRoot } from "../scope.js"
import { compareConstraints, isSubtypeComparison } from "./compare.js"
import {
    coalesceBranches,
    composeKeyedOperation,
    composeNodeOperation,
    equivalence,
    finalizeNodeOperation
} from "./compose.js"
import type { TypeNode, UnknownResolution } from "./node.js"

export const union = (l: TypeNode, r: TypeNode, scope: ScopeRoot) =>
    finalizeNodeOperation(l, nodeUnion(l, r, scope))

export const resolutionUnion = composeKeyedOperation<
    UnknownResolution,
    ScopeRoot
>((typeName, l, r, scope) => {
    if (l === undefined) {
        return r === undefined ? equivalence : r
    }
    if (r === undefined) {
        return l
    }
    const comparison = compareConstraints(l, r, { typeName, scope })
    if (isSubtypeComparison(comparison)) {
        return comparison === l ? r : l
    }
    const finalBranches = [
        ...comparison.lBranches.filter(
            (_, lIndex) =>
                !comparison.lStrictSubtypes.includes(lIndex) &&
                !comparison.equivalentTypes.some(
                    (indexPair) => indexPair[0] === lIndex
                )
        ),
        ...comparison.rBranches.filter(
            (_, rIndex) =>
                !comparison.rStrictSubtypes.includes(rIndex) &&
                !comparison.equivalentTypes.some(
                    (indexPair) => indexPair[1] === rIndex
                )
        )
    ]
    return coalesceBranches(typeName, finalBranches)
})

export const nodeUnion = composeNodeOperation(resolutionUnion)
