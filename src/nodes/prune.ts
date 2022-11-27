import { AttributesByType, TypeWithAttributes } from "./node.js"
import type { Node } from "./node.js"
import { pruneBigint } from "./types/bigint.js"
import { pruneBoolean } from "./types/boolean.js"
import { isDegenerate, pruneDegenerate } from "./types/degenerate.js"
import { pruneNumber } from "./types/number.js"
import { pruneObject } from "./types/object.js"
import { PruneFn } from "./types/operations.js"
import { pruneString } from "./types/string.js"

const attributePruners = {
    bigint: pruneBigint,
    boolean: pruneBoolean,
    number: pruneNumber,
    object: pruneObject,
    string: pruneString
} satisfies {
    [k in TypeWithAttributes]: PruneFn<AttributesByType[k]>
}

export const prune: PruneFn<Node> = (l, r, scope) => {
    if (isDegenerate(l) || isDegenerate(r)) {
        return pruneDegenerate(l, r, scope)
    }
    return l
}
