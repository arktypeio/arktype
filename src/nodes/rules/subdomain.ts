import type { Subdomain } from "../../utils/domains.js"
import type { Dict } from "../../utils/generics.js"
import { composeIntersection, empty, equal } from "../compose.js"
import { nodeIntersection } from "../intersection.js"
import type { TraversalNode, TypeNode } from "../node.js"
import { flattenNode } from "../node.js"
import type { PredicateContext } from "../predicate.js"
import type { FlattenAndPushRule } from "./rules.js"

// Unfortunately we can't easily abstract between these two rules because of
// nonsense TS circular reference issues.
export type SubdomainRule<scope extends Dict = Dict> =
    | Subdomain
    | ["Array", TypeNode<scope>]
    | ["Set", TypeNode<scope>]
    | ["Map", TypeNode<scope>, TypeNode<scope>]

export type TraversalSubdomainRule =
    | Subdomain
    | ["Array", TraversalNode]
    | ["Set", TraversalNode]
    | ["Map", TraversalNode, TraversalNode]

export const flattenSubdomain: FlattenAndPushRule<SubdomainRule> = (
    entries,
    rule,
    scope
) => {
    if (typeof rule === "string") {
        entries.push(["subdomain", rule])
    } else {
        const flattened: [Subdomain, ...TraversalNode[]] = [rule[0]]
        for (let i = 1; i < rule.length; i++) {
            flattened.push(flattenNode(rule[i], scope))
        }
        entries.push(["subdomain", flattened as TraversalSubdomainRule])
    }
}

export const subdomainIntersection = composeIntersection<
    SubdomainRule,
    PredicateContext
>((l, r, context) => {
    if (typeof l === "string") {
        if (typeof r === "string") {
            return l === r ? equal : empty
        }
        return l === r[0] ? r : empty
    }
    if (typeof r === "string") {
        return l[0] === r ? l : empty
    }
    if (l[0] !== r[0]) {
        return empty
    }
    const result: [Subdomain, ...TypeNode[]] = [l[0]]
    let lImpliesR = true
    let rImpliesL = true
    for (let i = 1; i < l.length; i++) {
        const parameterResult = nodeIntersection(l[i], r[i], context.scope)
        if (parameterResult === equal) {
            result.push(l[i])
        } else if (parameterResult === l) {
            result.push(l[i])
            rImpliesL = false
        } else if (parameterResult === r) {
            result.push(r[i])
            lImpliesR = false
        } else {
            result.push(parameterResult === empty ? "never" : parameterResult)
            lImpliesR = false
            rImpliesL = false
        }
    }
    return lImpliesR
        ? rImpliesL
            ? equal
            : l
        : rImpliesL
        ? r
        : (result as SubdomainRule)
})
