import type { ScopeRoot } from "../scope.js"
import type { TypeName } from "../utils/dataTypes.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import { isKeyOf, listFrom } from "../utils/generics.js"
import type { Node, TypeNode } from "./node.js"
import { intersectBigints } from "./types/bigint.js"
import { intersectBooleans } from "./types/boolean.js"
import {
    degenerateIntersection,
    isDegenerate,
    isNever
} from "./types/degenerate.js"
import type { Never } from "./types/degenerate.js"
import { intersectNumbers } from "./types/number.js"
import { intersectObjects } from "./types/object.js"
import { intersectStrings } from "./types/string.js"

export const intersect = (l: Node, r: Node, scope: ScopeRoot) =>
    isDegenerate(l) || isDegenerate(r)
        ? degenerateIntersection(l, r, scope)
        : typeIntersection(l, r, scope)

const attributeIntersections = {
    bigint: intersectBigints,
    boolean: intersectBooleans,
    number: intersectNumbers,
    object: intersectObjects,
    string: intersectStrings
}

const typeIntersection = (l: TypeNode, r: TypeNode, scope: ScopeRoot): Node => {
    const viable: mutable<TypeNode> = {}
    const inviable: Never[] = []
    let typeName: TypeName
    for (typeName in l) {
        if (isKeyOf(typeName, attributeIntersections)) {
            const result = attributeIntersections[typeName](
                l[typeName] as any,
                r[typeName] as any,
                scope
            )
            if (isNever(result)) {
                inviable.push(result)
            } else {
                viable[typeName] = result as any
            }
        }
    }
    return isEmpty(viable)
        ? {
              never: `No branches were viable:\n${JSON.stringify(
                  inviable,
                  null,
                  4
              )}`
          }
        : viable
}
