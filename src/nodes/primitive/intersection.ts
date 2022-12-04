import { boundsIntersection } from "../shared/bounds.js"
import type {
    BasePrimitiveAttributes,
    PrimitiveAttributeName,
    PrimitiveAttributes,
    PrimitiveAttributeType
} from "./attributes.js"
import { intersectionIfLiteral } from "./check.js"
import { divisorIntersection } from "./divisor.js"
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
    r: BasePrimitiveAttributes
): PrimitiveAttributes | "never" => {
    if (l.type !== r.type) {
        return "never"
    }
    const literalResult = intersectionIfLiteral(l, r)
    if (literalResult) {
        return literalResult
    }
    const result = { ...l, ...r }
    let k: PrimitiveAttributeName
    for (k in result) {
        // type and literal have already been handled, so skip those
        if (k !== "type" && k !== "literal" && l[k] && r[k]) {
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
