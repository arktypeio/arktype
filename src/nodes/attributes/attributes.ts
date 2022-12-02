import type { ScopeRoot } from "../../scope.js"
import type { dict } from "../../utils/typeOf.js"
import type { Node } from "../node.js"
import type { ObjectAttributes } from "./object.js"
import type {
    BasePrimitiveAttributes,
    BigintAttributes,
    BooleanAttributes,
    NullAttributes,
    NumberAttributes,
    StringAttributes,
    SymbolAttributes,
    UndefinedAttributes
} from "./primitive.js"

export type AttributesNode<scope extends dict = dict> =
    | BigintAttributes
    | BooleanAttributes
    | NullAttributes
    | NumberAttributes
    | ObjectAttributes<scope>
    | StringAttributes
    | SymbolAttributes
    | UndefinedAttributes

export const checkAttributes = (
    data: unknown,
    attributes: BasePrimitiveAttributes
) => true

export const attributesIntersection = (
    l: AttributesNode,
    r: AttributesNode,
    scope: ScopeRoot
): Node => {
    if (l.type !== r.type) {
        return "never"
    }
    return l
}
