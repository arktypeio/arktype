import { isEmpty } from "../../../utils/deepEquals.js"
import type { keyOrSet, keySet } from "../../../utils/generics.js"
import type { DifferenceOf, IntersectionOf } from "./attributes.js"

export const keyOrSetIntersection: IntersectionOf<keyOrSet> = (a, b) => {
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a === b ? a : { [a]: true, [b]: true }
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

export const keyOrSetDifference: DifferenceOf<keyOrSet> = (a, b) => {
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

export const keySetIntersection: IntersectionOf<keySet> = (a, b) =>
    Object.assign(a, b)

export const keySetDifference: DifferenceOf<keySet> = (a, b) => {
    for (const k in b) {
        delete a[k]
    }
    return isEmpty(a) ? null : a
}
