import type { record } from "../../utils/dataTypes.js"
import { isEmpty } from "../../utils/deepEquals.js"
import type { keySet, mutable, xor } from "../../utils/generics.js"
import { hasKey } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { intersect } from "../intersect.js"
import type { Node } from "../node.js"
import { prune } from "../prune.js"
import { TypeOperations } from "./operations.js"

export type ObjectAttributes = {
    readonly props?: record<Node>
    readonly requiredKeys?: keySet
} & SubtypeAttributes

// TODO: Add test cases for types of objects, (e.g. array with required string keys)
type SubtypeAttributes =
    | {
          subtype: "array"
          readonly elements?: Node | Node[]
          readonly bounds?: Bounds
      }
    | {
          subtype?: "function" | "record"
          elements?: undefined
          bounds?: undefined
      }

export const objectOperations = {
    intersect: (l, r, scope) => {
        const result = { ...l, ...r }
        for (const k in result) {
            if (hasKey(l, k) && hasKey(r, k)) {
                result[k] = intersect(l[k], r[k], scope)
            }
        }
        return result
    },
    prune: (l, r, scope) => {
        const result: mutable<record<Node>> = {}
        for (const k in l) {
            if (k in r) {
                result[k] = prune(l[k], r[k], scope) as any
                if (result[k] === null) {
                    delete result[k]
                }
            } else {
                result[k] = l[k]
            }
        }
        return isEmpty(result) ? null : result
    }
} satisfies TypeOperations<object, ObjectAttributes>
