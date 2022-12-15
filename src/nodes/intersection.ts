import type { ScopeRoot } from "../scope.js"
import { checkConstraints } from "../traverse/check.js"
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
import type { RawTypeRoot, RawTypeSet } from "./node.js"
import type { PredicateContext } from "./predicate.js"
import { comparePredicates, isConditionsComparison } from "./predicate.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"
import { collapsibleListUnion } from "./rules/collapsibleSet.js"
import { divisorIntersection } from "./rules/divisor.js"
import { rangeIntersection } from "./rules/range.js"
import { regexIntersection } from "./rules/regex.js"
import type { RuleSet, Validator } from "./rules/rules.js"

export const intersection = (
    l: RawTypeRoot,
    r: RawTypeRoot,
    scope: ScopeRoot
): RawTypeRoot => finalizeNodeOperation(l, nodeIntersection(l, r, scope))

const typeSetIntersection = composeKeyedOperation<RawTypeSet, ScopeRoot>(
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

export const branchResolutionIntersection: SetOperation<
    Condition,
    PredicateContext
> = (l, r, context) =>
    hasKey(l, "value")
        ? hasKey(r, "value")
            ? l.value === r.value
                ? equal
                : empty
            : checkConstraints(l.value, r, context)
            ? l
            : empty
        : hasKey(r, "value")
        ? checkConstraints(r.value, l, context)
            ? r
            : empty
        : attributesIntersection(l, r, context)

export const objectKindIntersection = composeRuleIntersection<ObjectDomain>(
    (l, r) => (l === r ? equal : empty)
)

const validatorIntersection =
    composeRuleIntersection<CollapsibleList<Validator>>(collapsibleListUnion)

const attributesIntersection = composeKeyedOperation<RuleSet, PredicateContext>(
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
