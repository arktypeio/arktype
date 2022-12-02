import type { ScopeRoot } from "../../scope.js"
import type { mutable } from "../../utils/generics.js"
import type { Node } from "../node.js"
import type { ObjectAttributes } from "./object.js"
import type {
    BasePrimitiveAttributes,
    BigintAttributes,
    BooleanAttributes,
    NullAttributes,
    NumberAttributes,
    StringAttributes,
    UndefinedAttributes
} from "./primitive.js"

export type Attributes =
    | BigintAttributes
    | BooleanAttributes
    | NullAttributes
    | NumberAttributes
    | ObjectAttributes
    | StringAttributes
    | UndefinedAttributes

export const checkAttributes = (
    data: unknown,
    attributes: BasePrimitiveAttributes
) => true

export const attributesIntersection = (
    l: BasePrimitiveAttributes,
    r: BasePrimitiveAttributes,
    scope: ScopeRoot
): Node => {
    if (l.type !== r.type) {
        return "never"
    }
    if (l.literal !== undefined) {
        if (r.literal !== undefined) {
            return l.literal === r.literal ? l : "never"
        }
        return checkAttributes(l.literal, r) ? l : "never"
    }
    if (r.literal !== undefined) {
        return checkAttributes(r.literal, l) ? r : "never"
    }
    const { type, literal, ...attributes } = { ...l, ...r }
    const result: mutable<BasePrimitiveAttributes> = { type }
    let k: IntersectedPrimitiveKey
    for (k in attributes) {
        if (l[k] && r[k]) {
            const keyResult = (intersections[k] as KeyIntersection<any>)(
                l[k],
                r[k],
                scope
            )
            if (keyResult === null) {
                return "never"
            }
            result[k] = keyResult
        }
    }
    return result
}
