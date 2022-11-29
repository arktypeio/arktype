import type { keySet, xor } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import { intersection } from "../intersection.js"
import type { Node } from "../node.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection } from "./bounds.js"
import type { KeyIntersection } from "./compose.js"
import { composeIntersection } from "./compose.js"
import type { Never } from "./degenerate.js"
import { isNever } from "./degenerate.js"
import { createUnequalLiteralsNever } from "./literals.js"

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
                isNever(propResult) &&
                (context.leftRoot.requiredKeys?.[k] ||
                    context.rightRoot.requiredKeys?.[k])
            ) {
                return bubbleUpRequiredPropNever(k, propResult)
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
) => (l === r ? l : createUnequalLiteralsNever(l, r))

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

export const bubbleUpRequiredPropNever = (
    key: string,
    propResult: Never
): Never => ({
    never: `required key '${key}' allows no values:\n${JSON.stringify(
        propResult
    )}`
})
