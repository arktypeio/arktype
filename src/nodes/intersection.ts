import type { ScopeRoot } from "../scope.js"
import { hasKey } from "../utils/generics.js"
import { boundsIntersection } from "./bounds.js"
import { checkAttributes } from "./check.js"
import type { ConstraintContext } from "./compare.js"
import { compareConstraints, isSubtypeComparison } from "./compare.js"
import { divisorIntersection } from "./divisor.js"
import type {
    BaseAttributes,
    BaseKeyedConstraint,
    BaseResolution,
    Node,
    Resolution
} from "./node.js"
import type { ContextualSetOperation } from "./operation.js"
import {
    coalesceBranches,
    composeKeyedOperation,
    composeNodeOperation,
    empty,
    equivalence,
    finalizeNodeOperation
} from "./operation.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"
import { regexIntersection } from "./regex.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot): Node =>
    finalizeNodeOperation(l, nodeIntersection(l, r, scope))

const resolutionIntersection = composeKeyedOperation<BaseResolution, ScopeRoot>(
    "&",
    (typeName, l, r, scope) => {
        const comparison = compareConstraints(l, r, { typeName, scope })
        if (isSubtypeComparison(comparison)) {
            return comparison
        }
        const finalBranches = [
            ...comparison.distinctIntersections,
            ...comparison.equivalentTypes.map(
                (indices) => comparison.lBranches[indices[0]]
            ),
            ...comparison.lStrictSubtypes.map(
                (lIndex) => comparison.lBranches[lIndex]
            ),
            ...comparison.rStrictSubtypes.map(
                (rIndex) => comparison.rBranches[rIndex]
            )
        ]
        return coalesceBranches(typeName, finalBranches)
    }
)

export const rootResolutionIntersection = (
    l: Resolution,
    r: Resolution,
    scope: ScopeRoot
) => finalizeNodeOperation(l, resolutionIntersection(l, r, scope)) as Resolution

export const nodeIntersection = composeNodeOperation(resolutionIntersection)

export const keyedConstraintsIntersection: ContextualSetOperation<
    BaseKeyedConstraint,
    ConstraintContext
> = (l, r, context) =>
    hasKey(l, "value")
        ? hasKey(r, "value")
            ? l.value === r.value
                ? equivalence
                : empty
            : checkAttributes(l.value, r, context)
            ? l
            : empty
        : hasKey(r, "value")
        ? checkAttributes(r.value, l, context)
            ? r
            : empty
        : attributesIntersection(l, r, context)

export const disjointIntersection = (l: string, r: string) =>
    l === r ? equivalence : empty

const attributesIntersection = composeKeyedOperation<
    BaseAttributes,
    ConstraintContext
>("&", {
    subtype: disjointIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection,
    props: propsIntersection,
    requiredKeys: requiredKeysIntersection,
    propTypes: propsIntersection,
    bounds: boundsIntersection
})
