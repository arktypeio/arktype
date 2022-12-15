import type { RawTypeRoot } from "../nodes/node.js"
import type { DomainContext } from "../nodes/predicate.js"
import type { ScopeRoot } from "../scope.js"

export const checkRules = (
    data: unknown,
    attributes: unknown,
    context: DomainContext
) => {
    return true
}

export const checkNode = (
    data: unknown,
    node: RawTypeRoot,
    scope: ScopeRoot
) => {
    return true
}
