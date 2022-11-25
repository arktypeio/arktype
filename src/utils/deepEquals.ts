import type { array, record } from "./dataTypes.js"
import { hasDataType, objectSubtypeOf } from "./dataTypes.js"

/**
 * Simple check for deep strict equality. Recurses into dictionaries and arrays,
 * shallowly tests === for any other value. Does not handle cyclic data.
 */
export const deepEquals = (a: unknown, b: unknown) => {
    if (a === b) {
        return true
    }
    if (!hasDataType(a, "object") || !hasDataType(b, "object")) {
        return false
    }
    const aSubtype = objectSubtypeOf(a)
    const bSubtype = objectSubtypeOf(b)
    if (aSubtype !== bSubtype) {
        return false
    }
    return aSubtype === "array"
        ? deepEqualsArray(a as array, b as array)
        : deepEqualsRecord(a as record, b as record)
}

const deepEqualsRecord = (a: record, b: record) => {
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

const deepEqualsArray = (a: array, b: array) => {
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

export const isEmpty = (o: array | record) => Object.keys(o).length === 0
