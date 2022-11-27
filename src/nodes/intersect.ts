import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import { isKeyOf, listFrom } from "../utils/generics.js"
import { AttributesByType, IntersectFn, TypeWithAttributes } from "./node.js"
import type { BranchingTypeNode, Node } from "./node.js"
import { intersectBigints } from "./types/bigint.js"
import { intersectBooleans } from "./types/boolean.js"
import {
    intersectDegenerate,
    isDegenerate,
    isNever
} from "./types/degenerate.js"
import type { Never } from "./types/degenerate.js"
import { intersectNumbers } from "./types/number.js"
import { intersectObjects } from "./types/object.js"
import { intersectStrings } from "./types/string.js"

export const intersect = (l: Node, r: Node, scope: ScopeRoot) =>
    isDegenerate(l) || isDegenerate(r)
        ? intersectDegenerate(l, r, scope)
        : intersectBranches(listFrom(l), listFrom(r), scope)

const attributeIntersections = {
    bigint: intersectBigints,
    boolean: intersectBooleans,
    number: intersectNumbers,
    object: intersectObjects,
    string: intersectStrings
} satisfies {
    [k in TypeWithAttributes]: IntersectFn<AttributesByType[k]>
}

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
            if (isKeyOf(type, attributeIntersections)) {
                const branchResult = attributeIntersections[type](
                    leftBranch as any,
                    rightBranches as any,
                    scope
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
