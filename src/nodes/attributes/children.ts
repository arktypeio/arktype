import type { keySet } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import type { KeyIntersection } from "../intersection.js"
import type { Node } from "../node.js"

export type ChildrenAttribute<scope extends dict> = {
    props?: dict<Node<scope>>
    mapped?: dict<Node<scope>>
    requiredKeys?: keySet
}

export const childrenIntersection: KeyIntersection<ChildrenAttribute<dict>> = (
    l,
    r,
    scope
) => l
