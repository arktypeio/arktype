import type { keySet } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import type { KeyIntersection } from "../intersection.js"
import type { Node } from "../node.js"

export type ChildrenAttribute = {
    props?: dict<Node>
    mapped?: dict<Node>
    requiredKeys?: keySet
}

export const childrenIntersection: KeyIntersection<ChildrenAttribute> = (
    l,
    r,
    scope
) => l
