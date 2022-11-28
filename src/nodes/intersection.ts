import type { ScopeRoot } from "../scope.js"
import { hasKey, hasKeys, isKeyOf, listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import type { Node, TypeNode } from "./node.js"
import { compareBigints } from "./types/bigint.js"
import { compareBooleans } from "./types/boolean.js"
import { compareDegenerate, isDegenerate } from "./types/degenerate.js"
import { compareNumbers } from "./types/number.js"
import { compareObjects } from "./types/object.js"
import { compareStrings } from "./types/string.js"
import type { UnfinalizedComparison } from "./types/utils.js"
import { nullifyEmpty } from "./types/utils.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot) => {
    const comparison =
        isDegenerate(l) || isDegenerate(r)
            ? compareDegenerate(l, r, scope)
            : compareTypes(l, r, scope)
    return hasKeys(comparison[1])
        ? (comparison[1] as Node)
        : {
              never: `Empty intersection:\n${JSON.stringify(
                  { left: l, right: r },
                  null,
                  4
              )}`
          }
}

export const compare = (l: Node, r: Node, scope: ScopeRoot) => {
    const comparison =
        isDegenerate(l) || isDegenerate(r)
            ? compareDegenerate(l, r, scope)
            : compareTypes(l, r, scope)
    return hasKeys(comparison[1])
        ? comparison[1]
        : {
              never: `Empty intersection:\n${JSON.stringify(
                  { left: l, right: r },
                  null,
                  4
              )}`
          }
}

const nonTrivialComparisons = {
    bigint: compareBigints,
    boolean: compareBooleans,
    number: compareNumbers,
    object: compareObjects,
    string: compareStrings
}

export const compareTypes = (l: TypeNode, r: TypeNode, scope: ScopeRoot) => {
    const result: UnfinalizedComparison<TypeNode> = [
        { ...l },
        { ...l, ...r },
        { ...r }
    ]
    let typeName: TypeName
    for (typeName in result[1]) {
        if (hasKey(l, typeName) && hasKey(r, typeName)) {
            if (!isKeyOf(typeName, nonTrivialComparisons)) {
                if (l[typeName] && r[typeName]) {
                    delete result[0][typeName]
                    delete result[2][typeName]
                }
            } else {
                const leftExclusive: any[] = []
                const intersection: any[] = []
                const rightExclusive: any[] = []
                for (const lBranch of listFrom(l[typeName])) {
                    for (const rBranch of listFrom(r[typeName])) {
                        const branchResult = nonTrivialComparisons[typeName](
                            lBranch as any,
                            rBranch as any,
                            scope
                        )
                        if (branchResult[0]) {
                            leftExclusive.push(branchResult[0])
                        }
                        if (branchResult[1]) {
                            intersection.push(branchResult[1])
                        }
                        if (branchResult[2]) {
                            rightExclusive.push(branchResult[2])
                        }
                    }
                }
                // TODO: Refactor
                if (leftExclusive.length) {
                    result[0][typeName] =
                        leftExclusive.length === 1
                            ? leftExclusive[0]
                            : leftExclusive
                }
                if (intersection.length) {
                    result[1]![typeName] =
                        intersection.length === 1
                            ? intersection[0]
                            : intersection
                }
                if (rightExclusive.length) {
                    result[2][typeName] =
                        rightExclusive.length === 1
                            ? rightExclusive[0]
                            : rightExclusive
                }
            }
        }
    }
    return [
        nullifyEmpty(result[0]),
        nullifyEmpty(result[1]),
        nullifyEmpty(result[2])
    ]
}
