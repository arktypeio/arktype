import type { dictionary } from "../../../utils/dynamicTypes.js"
import type { Attributes } from "./attributes.js"
import { intersect } from "./intersect.js"
import type { OperateAttribute } from "./operations.js"

export const operateProps: OperateAttribute<dictionary<Attributes>> = (
    a,
    b,
    operation
) => {
    for (const k in a) {
        if (k in b) {
            b[k] = intersect(a[k], b[k])
        }
    }
    return Object.assign(a, b)
}
