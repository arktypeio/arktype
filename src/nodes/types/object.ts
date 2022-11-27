import type { ScopeRoot } from "../../scope.js"
import type { record } from "../../utils/dataTypes.js"
import { isEmpty } from "../../utils/deepEquals.js"
import type { keySet, mutable, xor } from "../../utils/generics.js"
import { hasKey } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { intersectBounds } from "../bounds.js"
import { intersect } from "../intersect.js"
import type { IntersectFn, Node, PruneFn } from "../node.js"
import { prune } from "../prune.js"
import { isNever } from "./degenerate.js"
import { intersectKeySets } from "./utils.js"

export type ObjectAttributes = xor<PropsAttributes, {}> & SubtypeAttributes

export type PropsAttributes = {
    readonly props: PropsAttribute
    readonly requiredKeys: keySet
}

type PropsAttribute = record<Node>

type SubtypeAttributes =
    | {
          subtype: "array"
          readonly elements?: Node
          readonly bounds?: Bounds
      }
    | {
          subtype?: "function" | "record"
          elements?: undefined
          bounds?: undefined
      }

export const intersectObjects: IntersectFn<ObjectAttributes> = (
    l,
    r,
    scope
) => {
    const result = { ...l, ...r } as mutable<ObjectAttributes>
    if (l.props && r.props) {
        const requiredKeys = intersectKeySets(l.requiredKeys, r.requiredKeys)
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
                type: "never",
                reason: `${l.subtype} and ${r.subtype} are mutually exclusive`
            }
        }
        if (l.bounds && r.bounds) {
            const bounds = intersectBounds(l.bounds, r.bounds)
            if (isNever(bounds)) {
                return bounds
            }
            result.bounds = bounds
        }
        if (l.elements && r.elements) {
            const elements = intersect(l.elements, r.elements, scope)
            if (isNever(elements)) {
                return elements
            }
            result.elements = elements
        }
    }
    return result
}

export const pruneObject: PruneFn<ObjectAttributes> = (l, r, scope) => {
    return l
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
            result[k] = intersect(l[k], r[k], scope)
        }
    }
    return result
}

const pruneProps: PruneFn<PropsAttribute> = (l, r, scope) => {
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
