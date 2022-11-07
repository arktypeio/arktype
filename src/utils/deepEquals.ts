import type { array, dictionary } from "./dynamicTypes.js"
import { dynamicTypeOf, hasDynamicType } from "./dynamicTypes.js"

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

// TODO: Shallow when
// eslint-disable-next-line max-lines-per-function
export const pruneDeepEqual = <t extends dictionary>(
    objects: t[]
): Partial<t> => {
    const [base, ...compares] = objects
    const deepEqual: Partial<t> = {}
    for (const k in base) {
        const baseValue = base[k]
        const baseType = dynamicTypeOf(baseValue)
        if (
            !compares.every(
                (compare) =>
                    k in compare && hasDynamicType(compare[k], baseType)
            )
        ) {
            break
        }
        if (baseType === "dictionary") {
            const deepEqualAtKey = pruneDeepEqual(
                objects.map((o) => o[k] as dictionary)
            )
            if (Object.keys(deepEqualAtKey).length) {
                deepEqual[k] = deepEqualAtKey as any
                for (const o of objects) {
                    if (!Object.keys(o[k] as dictionary).length) {
                        delete o[k]
                    }
                }
            }
        } else if (
            baseType === "array"
                ? compares.every((compare) =>
                      deepEqualsArray(baseValue as array, compare[k] as array)
                  )
                : compares.every((compare) => baseValue === compare)
        ) {
            deepEqual[k] = baseValue
            for (const o of objects) {
                delete o[k]
            }
        }
    }
    return deepEqual
}
