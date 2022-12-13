import { hasObjectDomain } from "../utils/classify.js"
import type { List, listable } from "../utils/generics.js"
import { equal } from "./compose.js"

export const collapsibleListedSetUnion = <t>(
    l: listable<t>,
    r: listable<t>
): listable<t> | equal => {
    if (hasObjectDomain(l, "Array")) {
        if (hasObjectDomain(r, "Array")) {
            const result = listedSetUnion(l, r)
            return result.length === l.length
                ? result.length === r.length
                    ? equal
                    : l
                : result.length === r.length
                ? r
                : result
        }
        return l.includes(r) ? l : [...l, r]
    }
    if (hasObjectDomain(r, "Array")) {
        return r.includes(l) ? r : [...r, l]
    }
    return l === r ? equal : [l, r]
}

export const listedSetUnion = <t extends List>(l: t, r: t) => {
    const result = [...l]
    for (const expression of r) {
        if (!l.includes(expression)) {
            result.push(expression)
        }
    }
    return result
}
