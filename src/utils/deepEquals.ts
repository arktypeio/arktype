import { hasDomain, subdomainOf } from "./domains.js"
import type { Dict, List } from "./generics.js"

/**
 * Simple check for deep strict equality. Recurses into dictionaries and arrays,
 * shallowly tests === for any other value. Does not handle cyclic data.
 */
export const deepEquals = (a: unknown, b: unknown) => {
    if (a === b) {
        return true
    }
    if (!hasDomain(a, "object") || !hasDomain(b, "object")) {
        return false
    }
    const aObjectDomain = subdomainOf(a)
    const bObjectDomain = subdomainOf(b)
    if (aObjectDomain !== bObjectDomain) {
        return false
    }
    return aObjectDomain === "Array"
        ? deepEqualsArray(a as List, b as List)
        : deepEqualsDict(a as Dict, b as Dict)
}

const deepEqualsDict = (a: Dict, b: Dict) => {
    const unseenBKeys = { ...b }
    for (const k in a) {
        if (k in b && deepEquals(a[k], b[k])) {
            delete unseenBKeys[k]
        } else {
            return false
        }
    }
    if (Object.keys(unseenBKeys).length) {
        return false
    }
    return true
}

const deepEqualsArray = (a: List, b: List) => {
    if (a.length !== b.length) {
        return false
    }
    for (let i = 0; i < a.length; i++) {
        if (!deepEquals(a[i], b[i])) {
            return false
        }
    }
    return true
}
