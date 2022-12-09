import type { ScopeRoot } from "../scope.js"
import type { Dictionary } from "../utils/generics.js"
import { hasKey, listFrom } from "../utils/generics.js"
import { intersection } from "./intersection.js"
import type { Node, PrimitiveLiteral } from "./node.js"

export const union = (lNode: Node, rNode: Node, scope: ScopeRoot): Node => {
    const lBranches = listFrom(lNode)
    const rBranches = [...listFrom(rNode)]
    const result = lBranches
        .filter((l) => {
            const booleanLiteral = getPossibleBooleanLiteral(l)
            if (booleanLiteral !== undefined) {
                for (let i = 0; i < rBranches.length; i++) {
                    if (
                        getPossibleBooleanLiteral(rBranches[i]) ===
                        oppositeLiteral
                    ) {
                        rBranches[i] = "boolean"
                        return false
                    }
                }
                return true
            }
            return rBranches.every((r, i) => {
                const intersectionResult = intersection(l, r, scope)
                if (intersectionResult === l) {
                    // l is a subtype of r (don't include it)
                    return false
                }
                if (intersectionResult === r) {
                    // r is a subtype of l (don't include it)
                    rBranches.splice(i, 1)
                }
                return true
            })
        })
        .concat(rBranches)
    return result.length === 0
        ? "never"
        : result.length === 1
        ? result[0]
        : result
}

const getPossibleBooleanLiteral = (node: Node) =>
    hasKey(node.boolean, "value") ? node.boolean.value : undefined
