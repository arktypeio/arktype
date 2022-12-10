import type { ScopeRoot } from "../scope.js"
import type { TypeName } from "../utils/typeOf.js"
import {
    compareConstraints,
    composeKeyedOperation,
    composeNodeOperation,
    finalizeNodeOperation,
    isSubtypeComparison
} from "./intersection.js"
import type {
    BaseConstraints,
    BaseKeyedConstraint,
    BaseResolution,
    Node
} from "./node.js"

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

// TODO: Add aliases back if no subtype indices
export const coalesceBranches = (
    typeName: TypeName,
    branches: BaseKeyedConstraint[]
): BaseConstraints => {
    switch (branches.length) {
        case 0:
            // TODO: type is never, anything else that can be done?
            return []
        case 1:
            return branches[0]
        default:
            if (typeName === "boolean") {
                // If a boolean has multiple branches, neither of which is a
                // subtype of the other, it consists of two opposite literals
                // and can be simplified to a non-literal boolean.
                return true
            }
            return branches
    }
}
