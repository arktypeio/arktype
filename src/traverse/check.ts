import type { TypeNode } from "../nodes/node.js"
import type { DynamicDomainContext } from "../nodes/predicate.js"
import type { ScopeRoot } from "../scope.js"

export const checkRules = (
    data: unknown,
    attributes: unknown,
    context: DynamicDomainContext
) => {
    return true
}

export const checkNode = (data: unknown, node: TypeNode, scope: ScopeRoot) => {
    return true
}
