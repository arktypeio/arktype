import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import { isKeyOf, listFrom } from "../utils/generics.js"
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
}

const intersectBranches = (
    l: BranchingTypeNode,
    r: BranchingTypeNode,
    scope: ScopeRoot
): Node => {
    const viable: mutable<BranchingTypeNode> = []
    const inviable: Never[] = []
    for (const leftBranch of l) {
        const rightBranches = r.filter(
            (branch) => branch.type === leftBranch.type
        )
        for (const rightBranch of rightBranches) {
            const type = leftBranch.type
            if (isKeyOf(type, attributeIntersections)) {
                const branchResult = attributeIntersections[type](
                    leftBranch as any,
                    rightBranch as any,
                    scope
                )
                if (isNever(branchResult)) {
                    inviable.push(branchResult)
                } else {
                    viable.push({ type, ...branchResult } as any)
                }
            }
        }
    }
    return viable.length === 0
        ? {
              type: "never",
              reason: `No branches were viable:\n${JSON.stringify(
                  inviable,
                  null,
                  4
              )}`
          }
        : viable.length === 1
        ? viable[0]
        : viable
}
