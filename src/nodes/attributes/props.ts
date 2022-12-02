import type { keySet } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import { intersection } from "../intersection.js"
import type { Node } from "../node.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection } from "./bounds.js"
import type { KeyIntersection } from "./intersection.js"

export type PropsAttribute<scope extends dict> = dict<Node<scope>>

const propsIntersection: KeyIntersection<"props"> = (l, r, scope) => {
    const result = { ...l, ...r }
    for (const k in result) {
        if (l[k] && r[k]) {
            const propResult = intersection(l[k], r[k], scope)
            if (
                propResult === "never" &&
                (scope.leftRoot.requiredKeys?.[k] ||
                    scope.rightRoot.requiredKeys?.[k])
            ) {
                return "never"
            }
            result[k] = propResult
        }
    }
    return result
}
