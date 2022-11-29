import type { AttributeOperation } from "./operations.js"
import { applyOperation } from "./operations.js"

export const applyPropsOperation: AttributeOperation<"props"> = (
    operator,
    a,
    b
) => {
    for (const k in b) {
        if (k in a) {
            a[k] = applyOperation(operator, a[k], b[k]) as any
            if (a[k] === null) {
                return null
            }
        } else if (operator === "&") {
            a[k] = b[k]
        }
    }
    return a
}
