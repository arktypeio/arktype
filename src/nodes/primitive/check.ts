import { hasType } from "../../utils/typeOf.js"
import type { BasePrimitiveAttributes } from "./attributes.js"

export type PrimitiveKeyIntersection<t> = (l: t, r: t) => t | null

// Fix bigint to check right value
export const checkPrimitive = (
    data: unknown,
    attributes: BasePrimitiveAttributes
) => {
    if (hasType(data, attributes.type)) {
        return false
    }
}
