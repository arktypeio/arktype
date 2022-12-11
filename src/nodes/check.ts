import type { ScopeRoot } from "../scope.js"
import type { ConstraintContext } from "./compare.js"
import type { TypeNode, UnknownAttributes } from "./node.js"

export type AttributeChecker<data, k extends keyof UnknownAttributes> = (
    data: data,
    attribute: UnknownAttributes[k]
) => boolean

export const checkAttributes = (
    data: unknown,
    attributes: UnknownAttributes,
    context: ConstraintContext
) => {
    return true
}

export const checkNode = (data: unknown, node: TypeNode, scope: ScopeRoot) => {
    return true
}
