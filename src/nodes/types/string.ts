import type { mutable, xor } from "../../utils/generics.js"
import { getRegex } from "../../utils/regexCache.js"
import { hasType } from "../../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection, checkBounds } from "./bounds.js"
import { literalableIntersection } from "./literals.js"
import type { AttributesIntersection } from "./utils.js"
import { createIntersectionForKey } from "./utils.js"

export type StringAttributes = xor<
    {
        readonly regex?: string | readonly string[]
        readonly bounds?: Bounds
    },
    { readonly literal?: string }
>

export const stringIntersection: AttributesIntersection<StringAttributes> = (
    l,
    r
) => {
    const literalResult = literalableIntersection(l, r, checkString)
    if (literalResult) {
        return literalResult
    }
    return boundsIntersection(regexIntersection({}, l, r), l, r)
}

export const checkString = (data: string, attributes: StringAttributes) => {
    if (attributes.literal) {
        return attributes.literal === data
    }
    if (attributes.bounds && !checkBounds(data.length, attributes.bounds)) {
        return false
    }
    if (attributes.regex) {
        for (const source of attributes.regex) {
            if (!getRegex(source).test(data)) {
                return false
            }
        }
    }
    return true
}

const regexIntersection = createIntersectionForKey<StringAttributes, "regex">(
    "regex",
    (l, r) => {
        if (hasType(l, "string")) {
            if (hasType(r, "string")) {
                return l === r ? l : [l, r]
            }
            return r.includes(l) ? r : [...r, l]
        }
        if (hasType(r, "string")) {
            return l.includes(r) ? l : [...l, r]
        }
        const result = [...l]
        for (const expression of r) {
            if (!l.includes(expression)) {
                result.push(expression)
            }
        }
        return result
    }
)
