import type { ScopeRoot } from "../../scope.js"
import type { Subdomain } from "../../utils/domains.js"
import { composeIntersection, empty, equal } from "../compose.js"
import { nodeIntersection } from "../intersection.js"
import type { TypeNode } from "../node.js"
import type { PredicateContext } from "../predicate.js"

export type SubdomainRule =
    | Subdomain
    | ["Array", TypeNode]
    | ["Set", TypeNode]
    | ["Map", TypeNode, TypeNode]

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
            result[i] = l[i]
        } else if (parameterResult === l) {
            result[i] = l[i]
            rImpliesL = false
        } else if (parameterResult === r) {
            result[i] = r[i]
            lImpliesR = false
        } else {
            result[i] = parameterResult === empty ? "never" : parameterResult
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
