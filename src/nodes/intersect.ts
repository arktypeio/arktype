import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import { isKeyOf, listFrom } from "../utils/generics.js"
import type { BranchingTypeNode, Node } from "./node.js"
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
    l: BranchingTypeNode,
    r: BranchingTypeNode,
    scope: ScopeRoot
): Node => {
    const result: mutable<BranchingTypeNode> = []
    const pruned: Never[] = []
    for (const leftBranch of l) {
        const rightBranches = r.filter(
            (branch) => branch.type === leftBranch.type
        )
        if (rightBranches.length) {
            const type = leftBranch.type
            if (isKeyOf(type, intersectors)) {
                const branchResult = intersectors[type](
                    leftBranch as any,
                    rightBranches as any
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
