import { ScopeRoot } from "../scope.js"
import type { ObjectSubtypeName, record } from "../utils/dataTypes.js"
import type { keySet, xor } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"
import type { Node } from "./node.js"

export type ObjectAttributes = {
    readonly props?: record<Node>
    readonly requiredKeys?: keySet
} & SubtypeAttribute

// TODO: Add test cases for types of objects, (e.g. array with required string keys)
type SubtypeAttribute = xor<
    {
        array?:
            | true
            | {
                  readonly elements?: Node | Node[]
                  readonly bounds?: Bounds
              }
    },
    xor<{ record?: true }, { function?: true }>
>

// export const objectOperation = {
//     "&": (l, r) => l,
//     "-": (l) => l
// } satisfies SetOperations<ObjectAttributes, ScopeRoot>

// // TODO: Figure out prop never propagation
// export const propsOperation = {
//     "&": (l, r, scope) => {
//         const result = { ...l, ...r }
//         for (const k in result) {
//             if (hasKey(l, k) && hasKey(r, k)) {
//                 result[k] = intersection(l[k], r[k], scope)
//             }
//         }
//         return result
//     },
//     "-": (l, r, scope) => {
//         return l
//         // const result: MutableProps = {}
//         // for (const k in a) {
//         //     if (k in b) {
//         //         result[k] = difference(a[k], b[k], scope) as any
//         //         if (result[k] === null) {
//         //             delete result[k]
//         //         }
//         //     } else {
//         //         result[k] = a[k]
//         //     }
//         // }
//         // return isEmpty(result) ? undefined : result
//     }
// } satisfies SetOperations<PropsAttribute, ScopeRoot>
