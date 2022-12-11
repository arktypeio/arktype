import type { ScopeRoot } from "../scope.js"
import { hasKey } from "../utils/generics.js"
import type { ObjectSubtypeName } from "../utils/typeOf.js"
import { boundsIntersection } from "./bounds.js"
import { checkAttributes } from "./check.js"
import type { ConstraintContext } from "./compare.js"
import { compareConstraints, isSubtypeComparison } from "./compare.js"
import type { SetOperation } from "./compose.js"
import {
    coalesceBranches,
    composeConstraintIntersection,
    composeKeyedOperation,
    composeNodeOperation,
    empty,
    equivalence,
    finalizeNodeOperation
} from "./compose.js"
import { divisorIntersection } from "./divisor.js"
import type {
    BaseAttributes,
    BaseKeyedConstraint,
    BaseResolution,
    Node,
    Resolution
} from "./node.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"
import { regexIntersection } from "./regex.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot): Node =>
    finalizeNodeOperation(l, nodeIntersection(l, r, scope))

const resolutionIntersection = composeKeyedOperation<BaseResolution, ScopeRoot>(
    (typeName, l, r, scope) => {
        if (l === undefined) {
            return r === undefined ? equivalence : undefined
        }
        if (r === undefined) {
            return undefined
        }
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

export const nodeIntersection = composeNodeOperation(resolutionIntersection)

export const keyedConstraintsIntersection: SetOperation<
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

export const subtypeIntersection =
    composeConstraintIntersection<ObjectSubtypeName>((l, r) =>
        l === r ? equivalence : empty
    )

const attributesIntersection = composeKeyedOperation<
    BaseAttributes,
    ConstraintContext
>(
    {
        subtype: subtypeIntersection,
        divisor: divisorIntersection,
        regex: regexIntersection,
        props: propsIntersection,
        requiredKeys: requiredKeysIntersection,
        propTypes: propsIntersection,
        bounds: boundsIntersection
    },
    { propagateEmpty: true }
)
