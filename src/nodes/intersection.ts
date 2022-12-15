import type { ScopeRoot } from "../scope.js"
import { checkRules } from "../traverse/check.js"
import type { ObjectDomain } from "../utils/classify.js"
import type { CollapsibleList } from "../utils/generics.js"
import { hasKey } from "../utils/generics.js"
import type { SetOperation } from "./compose.js"
import {
    coalesceBranches,
    composeKeyedOperation,
    composeNodeOperation,
    composeRuleIntersection,
    empty,
    equal,
    finalizeNodeOperation
} from "./compose.js"
import type { TypeNode, TypeSet } from "./node.js"
import type { Condition, DynamicDomainContext } from "./predicate.js"
import { comparePredicates, isConditionsComparison } from "./predicate.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"
import { collapsibleListUnion } from "./rules/collapsibleSet.js"
import { divisorIntersection } from "./rules/divisor.js"
import { rangeIntersection } from "./rules/range.js"
import { regexIntersection } from "./rules/regex.js"
import type { Rules, Validator } from "./rules/rules.js"

export const intersection = (
    l: TypeNode,
    r: TypeNode,
    scope: ScopeRoot
): TypeNode => finalizeNodeOperation(l, nodeIntersection(l, r, scope))

const typeSetIntersection = composeKeyedOperation<TypeSet, ScopeRoot>(
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
        if (!isConditionsComparison(comparison)) {
            return comparison
        }
        const finalBranches = [
            ...comparison.intersections,
            ...comparison.equal.map(
                (indices) => comparison.lConditions[indices[0]]
            ),
            ...comparison.lSubconditionsOfR.map(
                (lIndex) => comparison.lConditions[lIndex]
            ),
            ...comparison.rSubconditionsOfL.map(
                (rIndex) => comparison.rConditions[rIndex]
            )
        ]
        return coalesceBranches(domain, finalBranches)
    }
)

export const nodeIntersection = composeNodeOperation(typeSetIntersection)

export const conditionIntersection: SetOperation<
    Condition,
    DynamicDomainContext
> = (l, r, context) => {
    const lResolution =
        typeof l === "string"
            ? context.scope.resolveToDomain(l, context.domain)
            : l
    const rResolution =
        typeof r === "string"
            ? context.scope.resolveToDomain(r, context.domain)
            : r
    return hasKey(lResolution, "value")
        ? hasKey(rResolution, "value")
            ? lResolution.value === rResolution.value
                ? equal
                : empty
            : checkRules(lResolution.value, rResolution, context)
            ? l
            : empty
        : hasKey(r, "value")
        ? checkRules(r.value, lResolution, context)
            ? r
            : empty
        : rulesIntersection(lResolution, rResolution, context)
}

export const objectKindIntersection = composeRuleIntersection<ObjectDomain>(
    (l, r) => (l === r ? equal : empty)
)

const validatorIntersection =
    composeRuleIntersection<CollapsibleList<Validator>>(collapsibleListUnion)

const rulesIntersection = composeKeyedOperation<Rules, DynamicDomainContext>(
    {
        kind: objectKindIntersection,
        divisor: divisorIntersection,
        regex: regexIntersection,
        props: propsIntersection,
        requiredKeys: requiredKeysIntersection,
        propTypes: propsIntersection,
        range: rangeIntersection,
        validator: validatorIntersection
    },
    { propagateEmpty: true }
)
