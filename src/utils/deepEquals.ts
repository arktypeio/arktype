import type { array, dictionary } from "./dynamicTypes.js"
import { dynamicTypeOf } from "./dynamicTypes.js"

/**
 * Simple check for deep strict equality. Recurses into dictionaries and arrays,
 * shallowly tests === for any other value. Does not handle cyclic data.
 */
export const deepEquals = (a: unknown, b: unknown) => {
    const typeOfA = dynamicTypeOf(a)
    const typeOfB = dynamicTypeOf(b)
    return typeOfA !== typeOfB
        ? false
        : typeOfA === "dictionary"
        ? deepEqualsObject(a as dictionary, b as dictionary)
        : typeOfA === "array"
        ? deepEqualsArray(a as array, b as array)
        : a === b
}

const deepEqualsObject = (a: dictionary, b: dictionary) => {
    const unseenBKeys = { ...b }
    for (const k in a) {
        if (a[k] !== b[k]) {
            return false
        }
        delete unseenBKeys[k]
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
        if (a[i] !== b[i]) {
            return false
        }
    }
    return true
}
