import type { TypeNode } from "../nodes/node.js"
import type { PredicateContext } from "../nodes/predicate.js"
import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/classify.js"

export const checkRules = (
    domain: Domain,
    data: unknown,
    attributes: unknown,
    scope: ScopeRoot
) => {
    return true
}

export const checkNode = (data: unknown, node: TypeNode, scope: ScopeRoot) => {
    return true
}
