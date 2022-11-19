import { isEmpty } from "../../../utils/deepEquals.js"
import type { AttributeIntersector } from "./intersect.js"
import { intersect } from "./intersect.js"
import type { AttributeSubtractor } from "./subtract.js"
import { subtract } from "./subtract.js"

export const intersectProps: AttributeIntersector<"props"> = (a, b) => {
    for (const k in b) {
        if (k in a) {
            a[k] = intersect(a[k], b[k])
        } else {
            a[k] = b[k]
        }
    }
    return a
}

export const subtractProps: AttributeSubtractor<"props"> = (a, b) => {
    for (const k in b) {
        if (k in a) {
            a[k] = subtract(a[k], b[k]) as any
            if (isEmpty(a[k])) {
                delete a[k]
            }
        }
    }
    return a
}
