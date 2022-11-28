import type { keySet, xor } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import type { Node, ScopedCompare } from "../node.js"
import { subcompareBounds } from "./bounds.js"
import type { Bounds } from "./bounds.js"
import { createSubcomparison, initializeComparison } from "./utils.js"

export type ObjectAttributes = xor<PropsAttributes, {}> & SubtypeAttributes

export type PropsAttributes = {
    readonly props: PropsAttribute
    readonly requiredKeys: keySet
}

type PropsAttribute = dict<Node>

type SubtypeAttributes =
    | {
          subtype: "array"
          readonly elements?: Node
          readonly bounds?: Bounds
      }
    | {
          subtype?: "function" | "none"
          elements?: undefined
          bounds?: undefined
      }

export const compareObjects: ScopedCompare<ObjectAttributes> = (
    l,
    r,
    scope
) => {
    const result = initializeComparison<ObjectAttributes>()
    subcompareSubtype(result, l, r)
    subcompareBounds(result, l, r)

    return result
}

const subcompareSubtype = createSubcomparison<ObjectAttributes, "subtype">(
    "subtype",
    (l, r) => (l === r ? [null, l, null] : [l, null, r])
)

const subcompareElements = createSubcomparison<ObjectAttributes, "elements">(
    "elements",
    (l, r) => (l === r ? [null, l, null] : [l, null, r])
)
