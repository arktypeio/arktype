import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import { hasKey } from "../utils/generics.js"
import { degenerateOperation } from "./degenerate.js"
import type { TypeCases, TypeName, TypeNode } from "./node.js"

export type NodeOperator = "&" | "-"

export const operation = <operator extends NodeOperator>(
    operator: operator,
    a: TypeNode,
    b: TypeNode,
    scope: ScopeRoot
): TypeNode =>
    a.degenerate || b.degenerate
        ? degenerateOperation(operator, a, b, scope)
        : casesOperation(a, b, scope)

const casesOperation = (
    a: TypeCases,
    b: TypeCases,
    scope: ScopeRoot
): TypeNode => {
    const result: TypeCases = {}
    let caseKey: TypeName
    for (caseKey in a) {
        if (hasKey(b, caseKey)) {
        }
    }
    return isEmpty(result)
        ? {
              degenerate: "never",
              // TODO: Delegate based on k
              reason: `${JSON.stringify(a)} and ${JSON.stringify(
                  b
              )} have no overlap`
          }
        : result
}

// export const difference = (a: Type, b: Type, scope: ScopeRoot) => {
//     a = expandIfAlias(a, scope)
//     b = expandIfAlias(b, scope)
//     const result: mutable<Attributes> = {}
//     let k: AttributeKey
//     for (k in a) {
//         if (k in b) {
//             const fn = operations[k].difference as DynamicOperation
//             result[k] = fn(a[k], b[k], scope)
//             if (result[k] === null) {
//                 delete result[k]
//             }
//         } else {
//             result[k] = a[k] as any
//         }
//     }
//     return isEmpty(result) ? null : result
// }

// export const isSubtype = (a: Type, b: Type, scope: ScopeRoot) =>
//     difference(b, a, scope) === null
