import type { ScopeRoot } from "../scope.js"
import type { Node } from "./node.js"
import { isDegenerate, pruneDegenerate } from "./types/degenerate.js"
import type { PruneFn } from "./types/operations.js"

export const prune: PruneFn<Node> = (l, r, scope) => {
    if (isDegenerate(l) || isDegenerate(r)) {
        return pruneDegenerate(l, r, scope)
    }
    return l
}
