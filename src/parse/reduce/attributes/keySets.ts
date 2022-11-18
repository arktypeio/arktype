import { isEmpty } from "../../../utils/deepEquals.js"
import type { keyOrSet, keySet } from "../../../utils/generics.js"

export const assignKeyOrSetIntersection = <k extends string = string>(
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
    return assignKeySetIntersection(a, b)
}

export const assignKeySetIntersection = <k extends string = string>(
    a: keySet<k>,
    b: keySet<k>
) => Object.assign(a, b)

export const assignKeyOrSetDifference = <k extends string = string>(
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
    return assignKeySetDifference(a, b)
}

export const assignKeySetDifference = <k extends string = string>(
    a: keySet<k>,
    b: keySet<k>
) => {
    for (const k in b) {
        delete a[k]
    }
    return isEmpty(a) ? null : a
}
