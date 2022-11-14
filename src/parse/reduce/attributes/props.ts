import { intersection } from "./intersection.js"

export const propsIntersection: AttributeIntersection<"props"> = (a, b) => {
    for (const k in a) {
        if (k in b) {
            b[k] = intersection(a[k], b[k]) as any
            if (b[k] === null) {
                return null
            }
        }
    }
    return Object.assign(a, b)
}

export const propsDifference: AttributeDifference<"props"> = (a, b) => {
    for (const k in a) {
        if (k in b) {
            b[k] = intersection(a[k], b[k]) as any
            if (b[k] === null) {
                return null
            }
        }
    }
    return a
}
