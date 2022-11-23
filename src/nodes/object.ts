import { ScopeRoot } from "../scope.js"
import type { keySet } from "../utils/generics.js"
import { hasKey } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"
import type { TypeNode } from "./node.js"
import { intersection } from "./operations.js"
import { SetOperations } from "./shared.js"

export type ObjectAttributes = {
    readonly props?: PropsAttribute
    readonly requiredKeys?: keySet
} & ObjectSubtypeAttributes

type PropsAttribute = { readonly [k in string]?: TypeNode }

type ObjectSubtypeAttributes =
    | ArrayAttributes
    | FunctionAttributes
    | StandardAttributes
    | {}

type ArrayAttributes = {
    readonly subtype: "array"
    readonly elements?: TypeNode | TypeNode[]
    readonly bounds?: Bounds
}

type FunctionAttributes = {
    readonly subtype: "function"
}

type StandardAttributes = {
    readonly subtype: "none"
}

export const objectOperation = {
    "&": (l, r) => l,
    "-": (l) => l
} satisfies SetOperations<ObjectAttributes, ScopeRoot>

// TODO: Figure out prop never propagation
export const propsOperation = {
    "&": (l, r, scope) => {
        const result = { ...l, ...r }
        for (const k in result) {
            if (hasKey(l, k) && hasKey(r, k)) {
                result[k] = intersection(l[k], r[k], scope)
            }
        }
        return result
    },
    "-": (l, r, scope) => {
        return l
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
