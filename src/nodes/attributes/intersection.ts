import type { ScopeRoot } from "../../scope.js"
import type { defined, mutable } from "../../utils/generics.js"
import type { Node } from "../node.js"
import type { AttributeName, BasePrimitiveAttributes } from "./attributes.js"
import { boundsIntersection } from "./bounds.js"
import { checkAttributes } from "./check.js"
import { divisorIntersection } from "./divisor.js"
import { regexIntersection } from "./regex.js"

export type KeyIntersection<k extends IntersectedKey> = (
    l: defined<BasePrimitiveAttributes[k]>,
    r: defined<BasePrimitiveAttributes[k]>,
    scope: ScopeRoot
) => defined<BasePrimitiveAttributes[k]> | null

type IntersectedKey = Exclude<AttributeName, "type" | "literal">

const intersections: {
    [k in IntersectedKey]: KeyIntersection<k>
} = {
    bounds: boundsIntersection,
    divisor: divisorIntersection,
    regex: regexIntersection
}

export const attributesIntersection = (
    l: BasePrimitiveAttributes,
    r: BasePrimitiveAttributes,
    scope: ScopeRoot
): Node => {
    if (l.type !== r.type) {
        return null
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
    let k: IntersectedKey
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
