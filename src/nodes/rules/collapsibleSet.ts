import { hasObjectDomain } from "../../utils/classify.js"
import type { CollapsibleList, List } from "../../utils/generics.js"
import { equal } from "../compose.js"

export const collapsibleListUnion = <t>(
    l: CollapsibleList<t>,
    r: CollapsibleList<t>
): CollapsibleList<t> | equal => {
    if (hasObjectDomain(l, "Array")) {
        if (hasObjectDomain(r, "Array")) {
            const result = listUnion(l, r)
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

export const listUnion = <t extends List>(l: t, r: t) => {
    const result = [...l]
    for (const expression of r) {
        if (!l.includes(expression)) {
            result.push(expression)
        }
    }
    return result
}
