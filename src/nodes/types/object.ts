import type { keySet, xor } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import { intersection } from "../intersection.js"
import type { Node } from "../node.js"
import type { Bounds } from "./bounds.js"
import type { ScopedAttributesIntersection } from "./utils.js"
import {
    AttributesIntersection,
    createIntersectionForKey,
    createNonOverlappingNever
} from "./utils.js"

export type ObjectAttributes = xor<PropsAttributes, {}> & SubtypeAttributes

export type PropsAttributes = {
    readonly props: dict<Node>
    readonly requiredKeys: keySet
}

type SubtypeAttributes =
    | {
          subtype: "array"
          readonly elements?: Node
          readonly bounds?: Bounds
      }
    | {
          subtype?: "function"
          elements?: undefined
          bounds?: undefined
      }

export const objectIntersection: ScopedAttributesIntersection<
    ObjectAttributes
> = (l, r, scope) => {
    subcompareRequiredKeys(result, l, r)
    subcompareProps(result, l, r, scope)
    subtypeIntersection(result, l, r)
    subcompareBounds(result, l, r)
    elementIntersection(result, l, r, scope)
    return result
}

const subtypeIntersection = createIntersectionForKey<
    ObjectAttributes,
    "subtype",
    { neverable: true }
>("subtype", (l, r) => (l === r ? l : createNonOverlappingNever(l, r)))

const elementIntersection = createIntersectionForKey<
    ObjectAttributes,
    "elements",
    { a: true; b: true }
>("elements", (l, r, scope) => intersection(l, r, scope))

const subcompareRequiredKeys = createIntersectionForKey<
    ObjectAttributes,
    "requiredKeys"
>("requiredKeys", (l, r) => {
    const result: Subcomparison<keySet> = [{}, { ...l, ...r }, {}]
    for (const k in result[1]) {
        if (l[k]) {
            if (!r[k]) {
                result[0][k] = true
            }
        } else if (r[k]) {
            result[2][k] = true
        }
    }
    return result
})

const subcompareProps = createIntersectionForKey<
    ObjectAttributes,
    "props",
    true
>("props", (lProps, rProps, scope) => {
    const result: Subcomparison<dict<Node>> = [{}, { ...lProps, ...rProps }, {}]
    for (const k in result[1]) {
        const l = lProps[k]
        const r = rProps[k]
        if (!l) {
            result[2][k] = r
        } else if (!r) {
            result[0][k] = l
        } else {
            const propComparison = intersection(l, r, scope)
            if (propComparison[0]) {
                result[0][k] = propComparison[0]
            }
            if (propComparison[2]) {
                result[2][k] = propComparison[2]
            }
            if (propComparison[1]) {
                // TODO: Propagate never here
                result[1][k] = propComparison[1]
            }
        }
    }
    return result
})
