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

type CheckedKey = Exclude<AttributeName, "type">

export type AttributeChecker<k extends CheckedKey> = (
    data: any,
    attribute: BaseAttributeType<k>,
    scope: ScopeRoot
) => boolean

type AttributeCheckers = { [k in CheckedKey]: AttributeChecker<k> }

const checkSubtype = (data: object, subtype: ObjectSubtypeName) =>
    hasObjectSubtype(data, subtype)

const checkers: AttributeCheckers = {
    literal: checkLiteral,
    regex: checkRegex,
    divisor: checkDivisor,
    bounds: checkBounds,
    subtype: checkSubtype,
    children: checkChildren
}

export const checkAttributes = (
    data: unknown,
    attributes: BaseAttributes,
    scope: ScopeRoot
) => {
    if (!hasType(data, attributes.type)) {
        return false
    }
    let k: AttributeName
    for (k in attributes) {
        if (k !== "type") {
            if (
                !(checkers[k] as AttributeChecker<any>)(
                    data,
                    attributes[k],
                    scope
                )
            ) {
                return false
            }
        }
    }
    return true
}
