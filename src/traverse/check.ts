import type { TypeNode } from "../nodes/node.js"
import type { PredicateContext } from "../nodes/predicate.js"
import type { ScopeRoot } from "../scope.js"

export const checkConstraints = (
    data: unknown,
    attributes: unknown,
    context: PredicateContext
) => {
    return true
}

export const checkNode = (data: unknown, node: TypeNode, scope: ScopeRoot) => {
    return true
}
