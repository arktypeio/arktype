import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import { hasKey, isKeyOf, listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import type {
    Node,
    NonTrivialTypeName,
    ScopedIntersection,
    TypeNode
} from "./node.js"
import {
    degenerateIntersection,
    isDegenerate,
    isNever
} from "./types/degenerate.js"
import type { Never } from "./types/degenerate.js"
import { literalOnlyIntersection } from "./types/literalOnly.js"
import { compareNumbers } from "./types/number.js"
import { objectIntersection } from "./types/object.js"
import { stringIntersection } from "./types/string.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot) =>
    isDegenerate(l) || isDegenerate(r)
        ? degenerateIntersection(l, r, scope)
        : typeIntersection(l, r, scope)

const nonTrivialIntersections = {
    bigint: literalOnlyIntersection,
    boolean: literalOnlyIntersection,
    number: compareNumbers,
    object: objectIntersection,
    string: stringIntersection
}

const typeIntersection: ScopedIntersection<TypeNode> = (l, r, scope) => {
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
    return isEmpty(viableTypes)
        ? {
              never: `Empty intersection:\n${JSON.stringify(
                  inviableTypes,
                  null,
                  4
              )}`
          }
        : viableTypes
}
