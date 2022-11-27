import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import { isKeyOf, listFrom } from "../utils/generics.js"
import type {
    AttributesByType,
    BranchNode,
    Node,
    TypeWithAttributes
} from "./node.js"
import {
    intersectDegenerate,
    isDegenerate,
    isNever
} from "./types/degenerate.js"
import type { Never } from "./types/degenerate.js"

export const intersect = (l: Node, r: Node, scope: ScopeRoot) =>
    isDegenerate(l) || isDegenerate(r)
        ? intersectDegenerate(l, r, scope)
        : intersectBranches(listFrom(l), listFrom(r), scope)

const intersectBranches = (
    l: BranchNode,
    r: BranchNode,
    scope: ScopeRoot
): Node => {
    const result: mutable<BranchNode> = []
    const pruned: Never[] = []
    for (const leftBranch of l) {
        const rightBranch = r.find((branch) => branch.type === leftBranch.type)
        if (rightBranch) {
            const type = leftBranch.type
            if (isKeyOf(type, intersectors)) {
                const branchResult = intersectors[type](
                    leftBranch as any,
                    rightBranch as any
                )
                if (isNever(branchResult)) {
                    pruned.push(branchResult)
                } else {
                    result.push({ type, ...branchResult } as any)
                }
            }
        }
    }
    return result.length
        ? result
        : {
              type: "never",
              reason: `No branches were viable:\n${JSON.stringify(
                  pruned,
                  null,
                  4
              )}`
          }
}
