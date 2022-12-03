import type { ScopeRoot } from "../../scope.js"
import type { dict } from "../../utils/typeOf.js"
import type { Node } from "../node.js"
import type { ObjectAttributes } from "./object.js"
import { objectIntersection } from "./object.js"
import type { PrimitiveAttributes } from "./primitive.js"
import { primitiveIntersection } from "./primitive.js"

export type AttributesNode<scope extends dict = dict> =
    | PrimitiveAttributes
    | ObjectAttributes<scope>

export const checkAttributes = (data: unknown, attributes: AttributesNode) =>
    true

export const attributesIntersection = (
    l: AttributesNode,
    r: AttributesNode,
    scope: ScopeRoot
): Node =>
    l.type !== r.type
        ? "never"
        : l.type === "object"
        ? objectIntersection(l, r as ObjectAttributes, scope)
        : primitiveIntersection(l, r as PrimitiveAttributes)
