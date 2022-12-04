import type { ScopeRoot } from "../scope.js"
import type { ObjectSubtypeName } from "../utils/typeOf.js"
import { hasObjectSubtype, hasType } from "../utils/typeOf.js"
import { checkBounds } from "./attributes/bounds.js"
import { checkChildren } from "./attributes/children.js"
import { checkDivisor } from "./attributes/divisor.js"
import { checkLiteral } from "./attributes/literal.js"
import { checkRegex } from "./attributes/regex.js"
import { resolveIfName } from "./names.js"
import type {
    AttributeName,
    BaseAttributes,
    BaseAttributeType,
    Node
} from "./node.js"

export const checkNode = (
    data: unknown,
    attributes: Node,
    scope: ScopeRoot
): boolean => {
    const resolution = resolveIfName(attributes, scope)
    return hasObjectSubtype(resolution, "array")
        ? resolution.some((branch) => checkNode(data, branch, scope))
        : checkAttributes(data, resolution, scope)
}

type ShallowCheckedKey = Exclude<AttributeName, "type" | "children">

export type AttributeChecker<k extends ShallowCheckedKey> = (
    data: any,
    attribute: BaseAttributeType<k>
) => boolean

type AttributeCheckers = { [k in ShallowCheckedKey]: AttributeChecker<k> }

const checkSubtype = (data: object, subtype: ObjectSubtypeName) =>
    hasObjectSubtype(data, subtype)

const checkers: AttributeCheckers = {
    literal: checkLiteral,
    regex: checkRegex,
    divisor: checkDivisor,
    bounds: checkBounds,
    subtype: checkSubtype
}

export const checkAttributes = (
    data: unknown,
    { type, children, ...shallowAttributes }: BaseAttributes,
    scope: ScopeRoot
) => {
    if (!hasType(data, type)) {
        return false
    }
    let k: ShallowCheckedKey
    for (k in shallowAttributes) {
        if (
            !(checkers[k] as AttributeChecker<any>)(data, shallowAttributes[k])
        ) {
            return false
        }
    }
    if (children) {
        return checkChildren(data as object, children, scope)
    }
    return true
}
