import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import { hasKey, hasKeys, isKeyOf, listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import type { Node, TypeNode } from "./node.js"
import { compareBigints } from "./types/bigint.js"
import { compareBooleans } from "./types/boolean.js"
import type { Never } from "./types/degenerate.js"
import {
    degenerateIntersection,
    isDegenerate,
    isNever
} from "./types/degenerate.js"
import { compareNumbers } from "./types/number.js"
import { compareObjects } from "./types/object.js"
import { compareStrings } from "./types/string.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot) =>
    isDegenerate(l) || isDegenerate(r)
        ? degenerateIntersection(l, r, scope)
        : typeIntersection(l, r, scope)

const nonTrivialIntersections = {
    bigint: compareBigints,
    boolean: compareBooleans,
    number: compareNumbers,
    object: compareObjects,
    string: compareStrings
}

const typeIntersection = (l: TypeNode, r: TypeNode, scope: ScopeRoot) => {
    const viableTypes: mutable<TypeNode> = {}
    const inviableTypes: { [k in TypeName]?: Never[] } = {}
    let typeName: TypeName
    for (typeName in l) {
        if (!isKeyOf(typeName, nonTrivialIntersections)) {
            viableTypes[typeName] = true
        } else if (hasKey(r, typeName)) {
            const viableBranches: any[] = []
            const inviableBranches: Never[] = []
            for (const lBranch of listFrom(l[typeName])) {
                for (const rBranch of listFrom(r[typeName])) {
                    const result = nonTrivialIntersections[typeName](
                        lBranch as any,
                        rBranch as any,
                        scope
                    )
                    if (isNever(result)) {
                        inviableBranches.push(result)
                    } else {
                        viableBranches.push(result)
                    }
                }
            }
            if (viableBranches.length) {
                viableTypes[typeName] =
                    viableBranches.length === 1
                        ? viableBranches[0]
                        : viableBranches
            } else {
                inviableTypes[typeName] = inviableBranches
            }
        }
    }
    return hasKeys(viableTypes)
        ? viableTypes
        : {
              never: `Empty intersection:\n${JSON.stringify(
                  inviableTypes,
                  null,
                  4
              )}`
          }
}
