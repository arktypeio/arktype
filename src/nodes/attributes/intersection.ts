import type { ScopeRoot } from "../../scope.js"
import { boundsIntersection } from "../shared/bounds.js"
import type {
    AttributeName,
    Attributes,
    BaseAttributes,
    BaseAttributeType
} from "./attributes.js"
import { childrenIntersection } from "./children.js"
import { divisorIntersection } from "./divisor.js"
import { intersectionIfLiteral } from "./literal.js"
import { regexIntersection } from "./regex.js"

export type KeyIntersection<t> = (l: t, r: t, scope: ScopeRoot) => t | null

type UnknownIntersection = KeyIntersection<any>

type IntersectedKey = Exclude<AttributeName, "type" | "literal">

const keyIntersections: {
    [k in IntersectedKey]: KeyIntersection<BaseAttributeType<k>>
} = {
    bounds: boundsIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection,
    subtype: (l, r) => (l === r ? l : null),
    children: childrenIntersection
}

export const attributesIntersection = (
    l: BaseAttributes,
    r: BaseAttributes,
    scope: ScopeRoot
): Attributes | "never" => {
    if (l.type !== r.type) {
        return "never"
    }
    const literalResult = intersectionIfLiteral(l, r, scope)
    if (literalResult) {
        return literalResult
    }
    const result = { ...l, ...r }
    let k: AttributeName
    for (k in result) {
        // type and literal have already been handled, so skip those
        if (k !== "type" && k !== "literal" && l[k] && r[k]) {
            const keyResult = (keyIntersections[k] as UnknownIntersection)(
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
    return result as Attributes
}
