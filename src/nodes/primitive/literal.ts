import type {
    BasePrimitiveAttributes,
    PrimitiveAttributes
} from "./attributes.js"
import { checkPrimitive } from "./check.js"

export type LiteralValue = string | number | boolean

export const literalableIntersection = (
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
