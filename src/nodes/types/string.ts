import type { mutable, xor } from "../../utils/generics.js"
import type { array } from "../../utils/typeOf.js"
import type { Bounds } from "../bounds.js"
import { boundsIntersection, checkBounds } from "../bounds.js"
import type { Compare, Intersection } from "../node.js"
import { isNever } from "./degenerate.js"

export type StringAttributes = xor<
    {
        readonly regex?: string | readonly string[]
        readonly bounds?: Bounds
    },
    { readonly literal?: string }
>

export const stringIntersection: Intersection<StringAttributes> = (l, r) => {
    if (l.literal !== undefined || r.literal !== undefined) {
        const literal = l.literal ?? r.literal!
        const attributes = l.literal ? r : l
        return checkString(literal, attributes)
            ? l
            : {
                  never: `'${literal}' is not allowed by '${JSON.stringify(r)}'`
              }
    }
    const result = { ...l, ...r } as mutable<StringAttributes>
    if (l.regex && r.regex) {
        result.regex = additiveIntersection(l.regex, r.regex)
    }
    if (l.bounds && r.bounds) {
        const bounds = boundsIntersection(l.bounds, r.bounds)
        if (isNever(bounds)) {
            return bounds
        }
        result.bounds = bounds
    }
    return result
}

export const pruneString: Compare<StringAttributes> = (branch, given) => {
    return branch
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

const additiveIntersection = <t>(
    l: t | array<t>,
    r: t | array<t>
): t | array<t> => {
    if (!Array.isArray(l)) {
        if (!Array.isArray(r)) {
            return l === r ? l : ([l, r] as any)
        }
        return r.includes(l) ? r : [...r, l]
    }
    if (!Array.isArray(r)) {
        return l.includes(r) ? l : [...l, r]
    }
    const result = [...l]
    for (const expression of r) {
        if (!result.includes(expression)) {
            result.push(expression)
        }
    }
    return result.length === 1 ? result[0] : result
}
