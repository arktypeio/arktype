import type { ScopeRoot } from "../../scope.js"
import { deepFreeze } from "../../utils/freeze.js"
import { isKeyOf } from "../../utils/generics.js"
import { intersection } from "../intersection.js"
import type { Node } from "../node.js"

const degenerateTypeNames = deepFreeze({
    never: true,
    unknown: true,
    any: true
})

export type DegenerateTypeName = keyof typeof degenerateTypeNames

export const degeneratableIntersection = (
    l: Node,
    r: Node,
    scope: ScopeRoot
): Node | undefined => {
    if (typeof l !== "string" && typeof r !== "string") {
        return
    }
    if (l === "never" || r === "never") {
        return "never"
    }
    if (typeof l === "string" && !isKeyOf(l, degenerateTypeNames)) {
        return intersection(
            scope.resolve(l),
            typeof r === "string" && !isKeyOf(r, degenerateTypeNames)
                ? scope.resolve(r)
                : r,
            scope
        )
    }
    if (typeof r === "string" && !isKeyOf(r, degenerateTypeNames)) {
        return intersection(l, scope.resolve(r), scope)
    }
    return l === "any" || r === "any" ? "any" : "unknown"
}
