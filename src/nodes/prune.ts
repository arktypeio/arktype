import type { Node, PruneFn } from "./node.js"
import { isDegenerate, pruneDegenerate } from "./types/degenerate.js"
import { pruneLiteralOnly } from "./types/literalOnly.js"
import { pruneNumber } from "./types/number.js"
import { pruneObject } from "./types/object.js"
import { pruneString } from "./types/string.js"

export const attributePruners = {
    bigint: pruneLiteralOnly,
    boolean: pruneLiteralOnly,
    number: pruneNumber,
    object: pruneObject,
    string: pruneString
}

export const prune: PruneFn<Node> = (l, r, scope) => {
    if (isDegenerate(l) || isDegenerate(r)) {
        return pruneDegenerate(l, r, scope)
    }
    return l
}
