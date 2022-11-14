import { isEmpty } from "../../../utils/deepEquals.js"
import type { keyOrSet, keySet } from "../../../utils/generics.js"

export const keyOrSetIntersection = <k extends string = string>(
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
    return keySetIntersection(a, b)
}

export const keySetIntersection = <k extends string = string>(
    a: keySet<k>,
    b: keySet<k>
) => Object.assign(a, b)

export const keyOrSetDifference = <k extends string = string>(
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
    return keySetDifference(a, b)
}

export const keySetDifference = <k extends string = string>(
    a: keySet<k>,
    b: keySet<k>
) => {
    for (const k in b) {
        delete a[k]
    }
    return isEmpty(a) ? null : a
}
