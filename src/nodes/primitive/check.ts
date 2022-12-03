import { hasType } from "../../utils/typeOf.js"
import type {
    BasePrimitiveAttributes,
    PrimitiveAttributes
} from "./attributes.js"

export type LiteralValue = string | number | boolean

export const intersectionIfLiteral = (
    l: BasePrimitiveAttributes,
    r: BasePrimitiveAttributes
): PrimitiveAttributes | "never" | undefined => {
    if (l.literal !== undefined) {
        if (r.literal !== undefined) {
            return l.literal === r.literal
                ? (l as PrimitiveAttributes)
                : "never"
        }
        return checkPrimitive(l.literal, r)
            ? (l as PrimitiveAttributes)
            : "never"
    }
    if (r.literal !== undefined) {
        return checkPrimitive(r.literal, l)
            ? (r as PrimitiveAttributes)
            : "never"
    }
}

// Fix bigint to check right value
export const checkPrimitive = (
    data: unknown,
    attributes: BasePrimitiveAttributes
) => {
    if (hasType(data, attributes.type)) {
        return false
    }
    return true
}
