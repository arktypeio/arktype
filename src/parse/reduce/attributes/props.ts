import type { Attribute } from "./attributes.js"
import { defineOperations } from "./attributes.js"
import { exclude, extract, intersect } from "./operations.js"

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
    extract: (a, b) => {
        const result: Attribute<"props"> = {}
        for (const k in a) {
            if (k in b) {
                result[k] = extract(a[k], b[k]) as any
                if (result[k] === null) {
                    delete result[k]
                }
            }
        }
        return result
    },
    exclude: (a, b) => {
        const result: Attribute<"props"> = {}
        for (const k in a) {
            if (k in b) {
                result[k] = exclude(a[k], b[k]) as any
                if (result[k] === null) {
                    delete result[k]
                }
            } else {
                result[k] = a[k]
            }
        }
        return result
    }
})
