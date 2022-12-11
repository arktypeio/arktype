import type { ScopeRoot } from "../scope.js"
import { compareConstraints, isSubtypeComparison } from "./compare.js"
import type { BaseResolution, Node, Resolution } from "./node.js"
import {
    coalesceBranches,
    composeKeyedOperation,
    composeNodeOperation,
    finalizeNodeOperation
} from "./operation.js"

export const union = (l: Node, r: Node, scope: ScopeRoot) =>
    finalizeNodeOperation(l, nodeUnion(l, r, scope))

export const resolutionUnion = composeKeyedOperation<BaseResolution, ScopeRoot>(
    "|",
    (typeName, l, r, scope) => {
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
    }
)

export const nodeUnion = composeNodeOperation(resolutionUnion)

export const rootResolutionUnion = (
    l: Resolution,
    r: Resolution,
    scope: ScopeRoot
) => finalizeNodeOperation(l, resolutionUnion(l, r, scope)) as Resolution
