import type { Attribute } from "./attributes.js"
import { defineOperations } from "./attributes.js"
import { exclude, intersect } from "./operations.js"

export const props = defineOperations<Attribute<"props">>()({
    intersect: (a, b, scope) => {
        for (const k in b) {
            if (k in a) {
                a[k] = intersect(a[k], b[k], scope)
            } else {
                a[k] = b[k]
            }
        }
        return a
    },
    exclude: (a, b) => {
        const difference: Attribute<"props"> = {}
        for (const k in a) {
            if (k in b) {
                difference[k] = exclude(a[k], b[k]) as any
                if (difference[k] === null) {
                    delete difference[k]
                }
            } else {
                difference[k] = a[k]
            }
        }
        return difference
    }
})
