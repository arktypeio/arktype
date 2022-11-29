import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import { hasKeys, listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import type { Node, NonTrivialTypeName, TypeNode } from "./node.js"
import { compareBigints } from "./types/bigint.js"
import { compareBooleans } from "./types/boolean.js"
import type { Never } from "./types/degenerate.js"
import { degenerateIntersection, isDegenerate } from "./types/degenerate.js"
import { numberIntersection } from "./types/number.js"
import { objectIntersection } from "./types/object.js"
import { stringIntersection } from "./types/string.js"
import { nullifyEmpty } from "./types/utils.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot) =>
    isDegenerate(l) || isDegenerate(r)
        ? degenerateIntersection(l, r, scope)
        : typeIntersection(l, r, scope)

const nonTrivialComparisons = {
    bigint: compareBigints,
    boolean: compareBooleans,
    number: numberIntersection,
    object: objectIntersection,
    string: stringIntersection
}

const typeIntersection = (l: TypeNode, r: TypeNode, scope: ScopeRoot): Node => {
    const result: mutable<TypeNode> = {}
    let typeName: TypeName
    for (typeName in l) {
        if (!r[typeName]) {
            continue
        }
        if (l[typeName] === true) {
            result[typeName] = r[typeName] as any
        } else if (r[typeName] === true) {
            result[typeName] = l[typeName] as any
        } else {
            const viableBranches: Node[] = []
            const inviableBranches: Never[] = []
            for (const lBranch of listFrom(l[typeName])) {
                for (const rBranch of listFrom(r[typeName])) {
                    const branchResult = nonTrivialComparisons[
                        typeName as NonTrivialTypeName
                    ](lBranch as any, rBranch as any, scope)
                }
            }
        }
    }
    return result
}
