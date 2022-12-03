import type { ScopeRoot } from "../scope.js"
import type { dict } from "../utils/typeOf.js"
import type { Node } from "./node.js"
import type {
    BaseObjectAttributes,
    ObjectAttributes
} from "./object/attributes.js"
import { checkObject, objectIntersection } from "./object/intersection.js"
import type {
    BasePrimitiveAttributes,
    PrimitiveAttributes
} from "./primitive/attributes.js"
import { checkPrimitive } from "./primitive/check.js"
import { primitiveIntersection } from "./primitive/intersection.js"

export type AttributesNode<scope extends dict = dict> =
    | PrimitiveAttributes
    | ObjectAttributes<scope>

export type BaseAttributes<scope extends dict = dict> =
    | BasePrimitiveAttributes
    | BaseObjectAttributes<scope>

export const checkAttributes = (
    data: unknown,
    attributes: AttributesNode,
    scope: ScopeRoot
) =>
    attributes.type === "object"
        ? checkObject(data, attributes, scope)
        : checkPrimitive(data, attributes)

export const attributesIntersection = (
    l: AttributesNode,
    r: AttributesNode,
    scope: ScopeRoot
): Node =>
    l.type === "object"
        ? objectIntersection(l, r, scope)
        : primitiveIntersection(l, r)
