import type { dictionary } from "../utils/dynamicTypes.js"
import type { Attribute, Type } from "./attributes.js"
import { defineOperations } from "./attributes.js"
import { intersection } from "./operations.js"

type MutableProps = dictionary<Type>

// TODO: Figure out prop never propagation
export const propsOperations = defineOperations<Attribute<"props">>()({
    intersection: (a, b, scope) => {
        const result = { ...a, ...b }
        for (const k in result) {
            if (k in a && k in b) {
                result[k] = intersection(a[k], b[k], scope)
            }
        }
        return result
    },
    difference: (a, b, scope) => {
        return a
        // const result: MutableProps = {}
        // for (const k in a) {
        //     if (k in b) {
        //         result[k] = difference(a[k], b[k], scope) as any
        //         if (result[k] === null) {
        //             delete result[k]
        //         }
        //     } else {
        //         result[k] = a[k]
        //     }
        // }
        // return isEmpty(result) ? undefined : result
    }
})
