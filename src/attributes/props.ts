import { isEmpty } from "../utils/deepEquals.js"
import type { dictionary } from "../utils/dynamicTypes.js"
import type { Attribute, Attributes } from "./attributes.js"
import { defineOperations } from "./attributes.js"
import { exclude, extract, intersect } from "./operations.js"

type MutableProps = dictionary<Attributes>

export const props = defineOperations<Attribute<"props">>()({
    intersect: (a, b, scope) => {
        const result = { ...a, ...b }
        for (const k in result) {
            if (k in a && k in b) {
                result[k] = intersect(a[k], b[k], scope)
            }
        }
        return result
    },
    extract: (a, b, scope) => {
        const result: MutableProps = {}
        for (const k in a) {
            if (k in b) {
                result[k] = extract(a[k], b[k], scope) as any
                if (result[k] === null) {
                    delete result[k]
                }
            }
        }
        return isEmpty(result) ? null : result
    },
    exclude: (a, b, scope) => {
        const result: MutableProps = {}
        for (const k in a) {
            if (k in b) {
                result[k] = exclude(a[k], b[k], scope) as any
                if (result[k] === null) {
                    delete result[k]
                }
            } else {
                result[k] = a[k]
            }
        }
        return isEmpty(result) ? null : result
    }
})

export const required = defineOperations<true>()({
    intersect: (a) => a,
    extract: (a) => a,
    exclude: () => null
})
