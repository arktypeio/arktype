import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { defined, stringKeyOf } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"

import type { Node } from "./node.js"

export const intersection = (lNode: Node, rNode: Node, scope: ScopeRoot) => {
    let k: TypeName
    for (k in rNode) {
        const l = rNode[k]
        const r = lNode[k]
        if (l === undefined || r === undefined) {
            continue
        }
        if (l === true) {
            result[k] = r as any
            continue
        }
        if (r === true) {
            result[k] = l as any
            continue
        }
        const viableBranches = branchesIntersection(
            k as ExtendableTypeName,
            listFrom(l),
            listFrom(r),
            scope
        )
        if (viableBranches.length) {
            result[k] =
                viableBranches.length === 1
                    ? viableBranches[0]
                    : (viableBranches as any)
        }
    }
    // If the operation included a name and its result is identical to the
    // original resolution of that name, return the name instead of its expanded
    // form as the result
    if (typeof l === "string" && deepEquals(result, lResolution)) {
        return l
    }
    if (typeof r === "string" && deepEquals(result, rResolution)) {
        return r
    }
}
