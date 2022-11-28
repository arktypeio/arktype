import type { xor } from "../../utils/generics.js"
import { hasType } from "../../utils/typeOf.js"
import type { Compare } from "../node.js"
import type { Bounds } from "./bounds.js"
import { checkBounds, subcompareBounds } from "./bounds.js"
import { compareIfLiteral } from "./literals.js"
import {
    createSubcomparison,
    initializeComparison,
    nullifyEmpty
} from "./utils.js"

export type StringAttributes = xor<
    {
        readonly regex?: string | readonly string[]
        readonly bounds?: Bounds
    },
    { readonly literal?: string }
>

export const compareStrings: Compare<StringAttributes> = (l, r) => {
    const literalResult = compareIfLiteral(l, r, checkString)
    if (literalResult) {
        return literalResult
    }
    const comparison = initializeComparison<StringAttributes>()
    subcompareRegex(comparison, l, r)
    subcompareBounds(comparison, l, r)
    return comparison
}

const regexCache: Record<string, RegExp> = {}

export const checkString = (data: string, attributes: StringAttributes) => {
    if (attributes.literal) {
        return attributes.literal === data
    }
    if (attributes.bounds && !checkBounds(data.length, attributes.bounds)) {
        return false
    }
    if (attributes.regex) {
        for (const source of attributes.regex) {
            if (!regexCache[source]) {
                regexCache[source] = new RegExp(source)
            }
            if (!regexCache[source].test(data)) {
                return false
            }
        }
    }
    return true
}

const subcompareRegex = createSubcomparison<StringAttributes, "regex">(
    "regex",
    (l, r) => {
        if (hasType(l, "string")) {
            if (hasType(r, "string")) {
                return l === r ? [null, l, null] : [l, [l, r], r]
            }
            return r.includes(l)
                ? [null, r, r.filter((_) => _ !== l)]
                : [l, [...r, l], r]
        }
        if (hasType(r, "string")) {
            return l.includes(r)
                ? [null, l, l.filter((_) => _ !== r)]
                : [l, [...l, r], r]
        }
        const lOnly = l.filter((_) => !r.includes(_))
        const rOnly = r.filter((_) => !l.includes(_))
        return [nullifyEmpty(lOnly), [...l, ...rOnly], nullifyEmpty(rOnly)]
    }
)
