import type { ScopeRoot } from "../../scope.js"
import type { keySet, mutable, xor } from "../../utils/generics.js"
import { hasKey } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import { intersection } from "../intersection.js"
import type { Node, ScopedCompare } from "../node.js"
import { subcompareBounds } from "./bounds.js"
import type { Bounds } from "./bounds.js"
import { isNever } from "./degenerate.js"
import { initializeComparison } from "./utils.js"

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

export const objectIntersection: ScopedCompare<ObjectAttributes> = (
    l,
    r,
    scope
) => {
    const result = initializeComparison<ObjectAttributes>()
    if (l.props && r.props) {
        const requiredKeys = { ...l.requiredKeys, ...r.requiredKeys }
        const props = intersectProps(l.props, r.props, requiredKeys, scope)
        if (isNever(props)) {
            return props
        }
        result.props = props
        result.requiredKeys = requiredKeys
    }
    if (l.subtype && r.subtype) {
        if (l.subtype !== r.subtype) {
            return {
                never: `${l.subtype} and ${r.subtype} are mutually exclusive`
            }
        }
        subcompareBounds(result, l, r)
        if (l.elements && r.elements) {
            const elements = intersection(l.elements, r.elements, scope)
            if (isNever(elements)) {
                return elements
            }
            result.elements = elements
        }
    }
    return result
}

const intersectProps = (
    l: PropsAttribute,
    r: PropsAttribute,
    requiredKeys: keySet,
    scope: ScopeRoot
) => {
    const result = { ...l, ...r }
    for (const k in result) {
        if (hasKey(l, k) && hasKey(r, k)) {
            result[k] = intersection(l[k], r[k], scope)
        }
    }
    return result
}
