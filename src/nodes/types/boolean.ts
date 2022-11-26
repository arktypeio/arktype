import { hasKey } from "../../utils/generics.js"
import type { TypeOperations } from "./operations.js"

export type BooleanAttributes = { readonly value?: boolean }

export const booleans: TypeOperations<boolean, BooleanAttributes> = {
    intersect: (l, r) => {
        if (hasKey(l, "value") && hasKey(r, "value")) {
            return l.value === r.value
                ? l
                : [{ type: "never", reason: "true and false have no overlap" }]
        }
        return hasKey(l, "value") ? l : r
    },
    subtract: (l, r) => {
        if (hasKey(l, "value")) {
            return l.value === r.value ? undefined : l
        }
    },
    check: (data, attributes) =>
        hasKey(attributes, "value") ? attributes.value === data : true
}
