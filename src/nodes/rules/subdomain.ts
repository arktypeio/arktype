import type { S } from "../../parse/definition.ts"
import type { Subdomain } from "../../utils/domains.ts"
import { composeIntersection, empty, equal } from "../compose.ts"
import { nodeIntersection } from "../intersection.ts"
import type { TraversalNode, TypeNode } from "../node.ts"
import { compileNode } from "../node.ts"
import type { PredicateContext } from "../predicate.ts"
import type { FlattenAndPushRule } from "./rules.ts"

// Unfortunately we can't easily abstract between these two rules because of
// nonsense TS circular reference issues.
export type SubdomainRule<s extends S = S> =
    | Subdomain
    | ["Array", TypeNode<s>]
    | ["Set", TypeNode<s>]
    | ["Map", TypeNode<s>, TypeNode<s>]

export type TraversalSubdomainRule =
    | Subdomain
    | ["Array", TraversalNode]
    | ["Set", TraversalNode]
    | ["Map", TraversalNode, TraversalNode]

export const compileSubdomain: FlattenAndPushRule<SubdomainRule> = (
    entries,
    rule,
    scope
) => {
    if (typeof rule === "string") {
        entries.push(["subdomain", rule])
    } else {
        const compiled: [Subdomain, ...TraversalNode[]] = [rule[0]]
        for (let i = 1; i < rule.length; i++) {
            compiled.push(compileNode(rule[i], scope))
        }
        entries.push(["subdomain", compiled as TraversalSubdomainRule])
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
