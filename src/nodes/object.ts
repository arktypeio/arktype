import type { TypeNode } from "ts-morph"
import type { Bounds } from "./bounds.js"
import { intersection } from "./operations.js"

export type ObjectAttributes = {
    props?: { readonly [k in string]?: TypeNode }
} & ObjectSubtypeAttributes

type ObjectSubtypeAttributes = ArrayAttributes | FunctionAttributes | {}

type ArrayAttributes = {
    subtype: "array"
    elements?: TypeNode | TypeNode[]
    bounds?: Bounds
}

type FunctionAttributes = {
    subtype: "function"
}

// TODO: Figure out prop never propagation
export const propsOperations = {
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
}
