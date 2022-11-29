import type { xor } from "../../utils/generics.js"
import { getRegex } from "../../utils/regexCache.js"
import { hasType } from "../../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection, checkBounds } from "./bounds.js"
import type { KeyIntersection } from "./compose.js"
import { composeIntersection } from "./compose.js"
import type { LiteralChecker } from "./literals.js"

export type StringAttributes = xor<
    {
        readonly regex?: string | readonly string[]
        readonly bounds?: Bounds
    },
    { readonly literal?: string }
>

export const checkString: LiteralChecker<StringAttributes> = (
    data,
    attributes
) => {
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

const regexIntersection: KeyIntersection<StringAttributes, "regex"> = (
    l,
    r
) => {
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

export const stringIntersection = composeIntersection<StringAttributes>({
    literal: checkString,
    regex: regexIntersection,
    bounds: boundsIntersection
})
