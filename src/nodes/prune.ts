import type { ScopeRoot } from "../scope.js"
import type { Node } from "./node.js"
import { isDegenerate, pruneDegenerate } from "./types/degenerate.js"

export const prune = (l: Node, r: Node, scope: ScopeRoot) => {
    if (isDegenerate(l) || isDegenerate(r)) {
        return pruneDegenerate(l, r, scope)
    }
    return l
}
