import { hasSubdomain } from "../../utils/domains.ts"
import type { CollapsibleList, List } from "../../utils/generics.ts"
import { equal } from "../compose.ts"

export const collapsibleListUnion = <t>(
    l: CollapsibleList<t>,
    r: CollapsibleList<t>
): CollapsibleList<t> | equal => {
    if (hasSubdomain(l, "Array")) {
        if (hasSubdomain(r, "Array")) {
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
    if (hasSubdomain(r, "Array")) {
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
