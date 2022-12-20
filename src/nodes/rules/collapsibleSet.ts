import { hasKind } from "../../utils/domains.js"
import type { CollapsibleTuple, List } from "../../utils/generics.js"
import { equal } from "../compose.js"

export const collapsibleListUnion = <t>(
    l: CollapsibleTuple<t>,
    r: CollapsibleTuple<t>
): CollapsibleTuple<t> | equal => {
    if (hasKind(l, "Array")) {
        if (hasKind(r, "Array")) {
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
    if (hasKind(r, "Array")) {
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
