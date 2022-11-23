import { ScopeRoot } from "../scope.js"
import type { Bounds } from "./bounds.js"
import type { TypeNode } from "./node.js"
import { operation } from "./operation.js"
import { SetOperations } from "./shared.js"

export type ObjectAttributes = {
    props?: PropsAttribute
} & ObjectSubtypeAttributes

type PropsAttribute = { readonly [k in string]?: TypeNode }

type ObjectSubtypeAttributes = ArrayAttributes | FunctionAttributes | {}

type ArrayAttributes = {
    subtype: "array"
    elements?: TypeNode | TypeNode[]
    bounds?: Bounds
}

type FunctionAttributes = {
    subtype: "function"
}

export const objectOperation = {
    intersection: (a) => a,
    difference: (a) => a
} satisfies SetOperations<ObjectAttributes, ScopeRoot>

// TODO: Figure out prop never propagation
export const propsOperation = {
    intersection: (a, b, scope) => {
        const result = { ...a, ...b }
        for (const k in result) {
            if (k in a && k in b) {
                result[k] = operation(a[k], b[k], scope)
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
} satisfies SetOperations<PropsAttribute, ScopeRoot>
