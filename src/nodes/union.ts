import type { TypeName } from "../utils/typeOf.js"
import {
    compareConstraints,
    composeKeyedOperation,
    isSubtypeComparison
} from "./intersection.js"
import type { BaseConstraints, BaseKeyedConstraint, BaseNode } from "./node.js"

export const union = composeKeyedOperation<BaseNode>("|", (l, r, context) => {
    const comparison = compareConstraints(l, r, context)
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
    return coalesceBranches(context.typeName, finalBranches)
})

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
