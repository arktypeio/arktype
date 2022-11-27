import type { ScopeRoot } from "../../scope.js"
import type { record } from "../../utils/dataTypes.js"
import { isEmpty } from "../../utils/deepEquals.js"
import type { keySet, mutable, xor } from "../../utils/generics.js"
import { hasKey } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { intersect } from "../intersect.js"
import type { Node } from "../node.js"
import { prune } from "../prune.js"
import { isNever } from "./degenerate.js"
import type { IntersectFn, PruneFn } from "./operations.js"
import { TypeOperations } from "./operations.js"
import { intersectKeySets, pruneKeySet } from "./utils.js"

export type ObjectAttributes = {
    readonly props?: PropsAttribute
    readonly requiredKeys?: keySet
} & SubtypeAttributes

type PropsAttribute = record<Node>

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
        const result: mutable<ObjectAttributes> = {}
        const props = intersectProps(l.props, r.props, scope)
        if (props) {
            if (isNever(props)) {
                return props
            }
            result.props = props
        }
        const requiredKeys = intersectKeySets(l.requiredKeys, r.requiredKeys)
        if (requiredKeys) {
            result.requiredKeys = requiredKeys
        }
        return l
    },
    prune: (l, r, scope) => {
        return l
    },
    check: (data, attributes, scope) => true
} satisfies TypeOperations<object, ObjectAttributes>

const intersectProps: IntersectFn<PropsAttribute | undefined> = (
    l,
    r,
    scope
) => {
    if (!l) {
        return r
    }
    if (!r) {
        return l
    }
    const props = { ...l, ...r }
    for (const k in props) {
        if (hasKey(l, k) && hasKey(r, k)) {
            props[k] = intersect(l[k], r[k], scope)
        }
    }
    return props
}

const pruneProps: PruneFn<PropsAttributes> = (l, r, scope) => {
    if (!l.props || !r.props) {
        return l
    }
    const props = { ...l.props }
    for (const k in l.props) {
        if (k in r.props) {
            const prunedProp = prune(l.props[k], r.props[k], scope)
            if (prunedProp) {
                props[k] = prunedProp
            } else {
                delete props[k]
            }
        }
    }
    if (!isEmpty(props)) {
        return {
            props,
            requiredKeys: pruneKeySet(l.requiredKeys, r.requiredKeys) ?? {}
        }
    }
}
