import type { mutable } from "../../utils/generics.js"
import type { BaseAttributes } from "../attributes.js"
import { boundsIntersection } from "../bounds.js"
import type {
    BasePrimitiveAttributes,
    PrimitiveAttributeName,
    PrimitiveAttributes,
    PrimitiveAttributeType
} from "./attributes.js"
import { divisorIntersection } from "./divisor.js"
import { literalableIntersection } from "./literal.js"
import { regexIntersection } from "./regex.js"

export type PrimitiveKeyIntersection<t> = (l: t, r: t) => t | null

type IntersectedPrimitiveKey = Exclude<
    PrimitiveAttributeName,
    "type" | "literal"
>

const primitiveIntersections: {
    [k in IntersectedPrimitiveKey]: PrimitiveKeyIntersection<
        PrimitiveAttributeType<k>
    >
} = {
    bounds: boundsIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection
}

export const primitiveIntersection = (
    l: BasePrimitiveAttributes,
    r: BaseAttributes
): PrimitiveAttributes | "never" => {
    if (l.type !== r.type) {
        return "never"
    }
    const literalResult = literalableIntersection(l, r)
    if (literalResult) {
        return literalResult
    }
    const { type, literal, ...attributes } = { ...l, ...r }
    const result: mutable<BasePrimitiveAttributes> = { type }
    let k: IntersectedPrimitiveKey
    for (k in attributes) {
        if (l[k] && r[k]) {
            const keyResult = (
                primitiveIntersections[k] as PrimitiveKeyIntersection<any>
            )(l[k], r[k])
            if (keyResult === null) {
                return "never"
            }
            result[k] = keyResult
        }
    }
    return result as PrimitiveAttributes
}
