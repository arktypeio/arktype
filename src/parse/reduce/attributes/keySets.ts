import { isEmpty } from "../../../utils/deepEquals.js"
import type { keyOrSet, keySet } from "../../../utils/generics.js"
import type { AttributeOperator } from "./operations.js"

export const applyKeyOrSetOperation = <k extends string = string>(
    operator: AttributeOperator,
    a: keyOrSet<k>,
    b: keyOrSet<k>
): keyOrSet<k> | null =>
    operator === "&"
        ? applyKeyOrSetIntersection(a, b)
        : applyKeyOrSetDifference(a, b)

export const applyKeySetOperation = <k extends string = string>(
    operator: AttributeOperator,
    a: keySet<k>,
    b: keySet<k>
): keySet<k> | null =>
    operator === "&"
        ? applyKeySetIntersection(a, b)
        : applyKeySetDifference(a, b)

const applyKeyOrSetIntersection = <k extends string = string>(
    a: keyOrSet<k>,
    b: keyOrSet<k>
): keyOrSet<k> => {
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a === b ? a : ({ [a]: true, [b]: true } as keySet<k>)
        }
        b[a] = true
        return b
    }
    if (typeof b === "string") {
        a[b] = true
        return a
    }
    return applyKeySetIntersection(a, b)
}

const applyKeySetIntersection = <k extends string = string>(
    a: keySet<k>,
    b: keySet<k>
) => Object.assign(a, b)

const applyKeyOrSetDifference = <k extends string = string>(
    a: keyOrSet<k>,
    b: keyOrSet<k>
) => {
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a === b ? null : a
        }
        return a in b ? null : a
    }
    if (typeof b === "string") {
        delete a[b]
        return isEmpty(a) ? null : a
    }
    return applyKeySetDifference(a, b)
}

const applyKeySetDifference = <k extends string = string>(
    a: keySet<k>,
    b: keySet<k>
) => {
    for (const k in b) {
        delete a[k]
    }
    return isEmpty(a) ? null : a
}
