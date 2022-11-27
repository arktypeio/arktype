import type { ScopeRoot } from "../../scope.js"
import type { record } from "../../utils/dataTypes.js"
import { isEmpty } from "../../utils/deepEquals.js"
import type { keySet, mutable, xor } from "../../utils/generics.js"
import { hasKey } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { intersect } from "../intersect.js"
import type { Node } from "../node.js"
import { prune } from "../prune.js"
import type { IntersectFn, PruneFn } from "./operations.js"
import { TypeOperations } from "./operations.js"
import { intersectKeySets, pruneKeySet } from "./utils.js"

export type ObjectAttributes = PropsAttributes & SubtypeAttributes

type PropsAttributes = xor<
    {
        readonly props: record<Node>
        readonly requiredKeys: keySet
    },
    {}
>

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
        return l
    },
    prune: (l, r, scope) => {
        return l
    }
} satisfies TypeOperations<object, ObjectAttributes>

const intersectProps: IntersectFn<PropsAttributes> = (l, r, scope) => {
    if (!l.props) {
        return r
    }
    if (!r.props) {
        return l
    }
    const props = { ...l.props, ...r.props }
    for (const k in props) {
        if (hasKey(l.props, k) && hasKey(r.props, k)) {
            props[k] = intersect(l.props[k], r.props[k], scope)
        }
    }
    return {
        props,
        requiredKeys: intersectKeySets(l.requiredKeys, r.requiredKeys)
    }
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
