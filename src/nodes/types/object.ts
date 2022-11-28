import type { ScopeRoot } from "../../scope.js"
import { isEmpty } from "../../utils/deepEquals.js"
import type { keySet, mutable, xor } from "../../utils/generics.js"
import { hasKey } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import { intersection } from "../intersection.js"
import type { Node, ScopedCompare } from "../node.js"
import { addBoundsComparison } from "./bounds.js"
import type { Bounds } from "./bounds.js"
import { isNever } from "./degenerate.js"

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
    const result = { ...l, ...r } as mutable<ObjectAttributes>
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
        if (l.bounds && r.bounds) {
            const bounds = addBoundsComparison(l.bounds, r.bounds)
            if (isNever(bounds)) {
                return bounds
            }
            result.bounds = bounds
        }
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

const pruneProps: ScopedCompare<PropsAttribute> = (l, r, scope) => {
    const result = { ...l }
    for (const k in l) {
        if (k in r.props) {
            const prunedProp = prune(l[k], r[k], scope)
            if (prunedProp) {
                result[k] = prunedProp
            } else {
                delete result[k]
            }
        }
    }
    if (!isEmpty(result)) {
        return result
    }
}

export const pruneRequiredKeys = (l: keySet, r: keySet): keySet | undefined => {
    const result = { ...l }
    for (const k in r) {
        delete result[k]
    }
    return isEmpty(result) ? undefined : result
}
