import type { ScopeRoot } from "../scope.js"
import type { Node } from "./node.js"
import { isDegenerate, subtractDegenerate } from "./types/degenerate.js"

export const subtract = (l: Node, r: Node, scope: ScopeRoot) => {
    if (isDegenerate(l) || isDegenerate(r)) {
        return subtractDegenerate(l, r, scope)
    }
    return l
}
