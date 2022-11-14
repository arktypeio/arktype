import type { AttributeIntersection } from "./intersection.js"
import { intersection } from "./intersection.js"

export const propsIntersection: AttributeIntersection<"props"> = (a, b) => {
    for (const k in a) {
        if (k in b) {
            b[k] = intersection(a[k], b[k]) as any
        }
    }
    return Object.assign(a, b)
}
