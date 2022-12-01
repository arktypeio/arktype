import type { keySet, xor } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import { intersection } from "../intersection.js"
import type { Node } from "../node.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection } from "./bounds.js"
import type { KeyIntersection } from "./compose.js"
import { composeIntersection } from "./compose.js"

export type ObjectAttributes<scope extends dict = dict> = xor<
    PropsAttributes<scope>,
    {}
> &
    SubtypeAttributes

export type PropsAttributes<scope extends dict> = {
    readonly props: dict<Node<scope>>
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

const propsIntersection: KeyIntersection<ObjectAttributes, "props"> = (
    l,
    r,
    context
) => {
    const result = { ...l, ...r }
    for (const k in result) {
        if (l[k] && r[k]) {
            const propResult = intersection(l[k], r[k], context.scope)
            if (
                propResult === "never" &&
                (context.leftRoot.requiredKeys?.[k] ||
                    context.rightRoot.requiredKeys?.[k])
            ) {
                return "never"
            }
            result[k] = propResult
        }
    }
    return result
}

const requiredKeysIntersection: KeyIntersection<
    ObjectAttributes,
    "requiredKeys"
> = (l, r) => ({
    ...l,
    ...r
})

const subtypeIntersection: KeyIntersection<ObjectAttributes, "subtype"> = (
    l,
    r
) => (l === r ? l : "never")

const elementsIntersection: KeyIntersection<ObjectAttributes, "elements"> = (
    l,
    r,
    context
) => intersection(l, r, context.scope)

export const objectIntersection = composeIntersection<ObjectAttributes>({
    props: propsIntersection,
    requiredKeys: requiredKeysIntersection,
    subtype: subtypeIntersection,
    elements: elementsIntersection,
    bounds: boundsIntersection
})
