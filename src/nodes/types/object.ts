import type { ScopeRoot } from "../../scope.js"
import type { keySet, xor } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import { intersection } from "../intersection.js"
import type { Node } from "../node.js"
import type { Bounds } from "./bounds.js"
import type { Never } from "./degenerate.js"
import type { ScopedAttributesIntersection } from "./utils.js"
import { createIntersectionForKey, createNonOverlappingNever } from "./utils.js"

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
    let result = subtypeIntersection({}, l, r)
    result = requiredKeysIntersection(result, l, r)
    result = propsIntersection(result, l, r, {
        scope,
        requiredKeys: result.requiredKeys ?? {}
    })
    result = subcompareBounds(result, l, r)

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
    {
        context: ScopeRoot
        neverable: true
    }
>("elements", (l, r, scope) => intersection(l, r, scope))

const requiredKeysIntersection = createIntersectionForKey<
    ObjectAttributes,
    "requiredKeys"
>("requiredKeys", (l, r) => ({ ...l, ...r }))

const propsIntersection = createIntersectionForKey<
    ObjectAttributes,
    "props",
    {
        context: { scope: ScopeRoot; requiredKeys: keySet }
        neverable: true
    }
>("props", (l, r, { scope, requiredKeys }) => {
    const result = { ...l, ...r }
    for (const k in result) {
        if (l[k] && r[k]) {
        }
    }
    return result
})
