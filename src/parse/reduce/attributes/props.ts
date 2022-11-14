import type { AttributeOperation } from "./operations.js"
import { applyOperation } from "./operations.js"

export const propsOperation: AttributeOperation<"props"> = (operator, a, b) => {
    for (const k in a) {
        if (k in b) {
            b[k] = applyOperation(operator, a[k], b[k]) as any
            if (b[k] === null) {
                return null
            }
        }
    }
    return Object.assign(a, b)
}
