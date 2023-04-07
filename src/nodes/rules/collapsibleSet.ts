import type { CollapsibleList, List } from "../../utils/generics.js"
import type { Equal } from "../compose.js"
import { equality } from "../compose.js"

export const collapsibleListUnion: <t>(
    l: CollapsibleList<t>,
    r: CollapsibleList<t>
) => CollapsibleList<t> | Equal = (l, r) => {
    if (Array.isArray(l)) {
        if (Array.isArray(r)) {
            const result = listUnion(l, r)
            return result.length === l.length
                ? result.length === r.length
                    ? equality()
                    : l
                : result.length === r.length
                ? r
                : result
        }
        return l.includes(r) ? l : [...l, r]
    }
    if (Array.isArray(r)) {
        return r.includes(l) ? r : [...r, l]
    }
    return l === r ? equality() : [l, r]
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
