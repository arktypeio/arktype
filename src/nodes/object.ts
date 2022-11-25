import type { record } from "../utils/dataTypes.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { keySet, mutable } from "../utils/generics.js"
import { hasKey } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"
import {
    AttributeDifferenceMapper,
    AttributeIntersectionMapper,
    intersect,
    subtract
} from "./node.js"
import type { Node } from "./node.js"
import { intersectKeySets, subtractKeySets } from "./shared.js"

export type ObjectAttributes = {
    readonly props?: record<Node>
    readonly requiredKeys?: keySet
    readonly subtype?: SubtypeAttribute
}

// TODO: Add test cases for types of objects, (e.g. array with required string keys)
type SubtypeAttribute =
    | {
          kind: "array"
          readonly elements?: Node | Node[]
          readonly bounds?: Bounds
      }
    | { kind: "record" }
    | { kind: "function" }

const intersectObjectAttributes = {
    // TODO: Figure out prop never propagation
    props: (l, r, scope) => {
        const result = { ...l, ...r }
        for (const k in result) {
            if (hasKey(l, k) && hasKey(r, k)) {
                result[k] = intersect(l[k], r[k], scope)
            }
        }
        return result
    },
    requiredKeys: intersectKeySets,
    subtype: (l, r) => l
} satisfies AttributeIntersectionMapper<ObjectAttributes>

const subtractObjectAttributes = {
    props: (l, r, scope) => {
        const result: mutable<record<Node>> = {}
        for (const k in l) {
            if (k in r) {
                result[k] = subtract(l[k], r[k], scope) as any
                if (result[k] === null) {
                    delete result[k]
                }
            } else {
                result[k] = l[k]
            }
        }
        return isEmpty(result) ? null : result
    },
    requiredKeys: subtractKeySets,
    subtype: (l, r) => l
} satisfies AttributeDifferenceMapper<ObjectAttributes>
