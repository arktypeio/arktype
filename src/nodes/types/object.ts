import type { keySet, xor } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import { compare } from "../compare.js"
import type { Node, ScopedCompare } from "../node.js"
import { subcompareBounds } from "./bounds.js"
import type { Bounds } from "./bounds.js"
import type { Subcomparison } from "./utils.js"
import { createSubcomparison, initializeComparison } from "./utils.js"

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

export const compareObjects: ScopedCompare<ObjectAttributes> = (
    l,
    r,
    scope
) => {
    const result = initializeComparison<ObjectAttributes>()
    subcompareRequiredKeys(result, l, r)
    subcompareProps(result, l, r, scope)
    subcompareSubtype(result, l, r)
    subcompareBounds(result, l, r)
    subcompareElements(result, l, r, scope)
    return result
}

const subcompareSubtype = createSubcomparison<ObjectAttributes, "subtype">(
    "subtype",
    (l, r) => (l === r ? [null, l, null] : [l, null, r])
)

const subcompareElements = createSubcomparison<
    ObjectAttributes,
    "elements",
    true
>("elements", (l, r, scope) => compare(l, r, scope))

const subcompareRequiredKeys = createSubcomparison<
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

const subcompareProps = createSubcomparison<ObjectAttributes, "props", true>(
    "props",
    (lProps, rProps, scope) => {
        const result: Subcomparison<dict<Node>> = [
            {},
            { ...lProps, ...rProps },
            {}
        ]
        for (const k in result[1]) {
            const l = lProps[k]
            const r = rProps[k]
            if (!l) {
                result[2][k] = r
            } else if (!r) {
                result[0][k] = l
            } else {
                const propComparison = compare(l, r, scope)
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
    }
)
