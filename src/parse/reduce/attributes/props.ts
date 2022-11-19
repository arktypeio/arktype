import type { AttributeIntersection } from "./intersection.js"
import { assignIntersection } from "./intersection.js"

export const assignPropsIntersection: AttributeIntersection<"props"> = (
    a,
    b
) => {
    for (const k in b) {
        if (k in a) {
            a[k] = assignIntersection(a[k], b[k])
        } else {
            a[k] = b[k]
        }
    }
    return a
}
