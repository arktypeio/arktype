import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import { hasKey } from "../utils/generics.js"
import { degenerateOperation } from "./degenerate.js"
import type { TypeCases, TypeName, TypeNode } from "./node.js"
import type { SetOperation } from "./shared.js"

export type NodeOperator = "&" | "-"

export const intersection: SetOperation<TypeNode, ScopeRoot> = (l, r, scope) =>
    operation("&", l, r, scope)

export const difference: SetOperation<TypeNode, ScopeRoot> = (l, r, scope) =>
    operation("-", l, r, scope)

export const operation = (
    operator: NodeOperator,
    l: TypeNode,
    r: TypeNode,
    scope: ScopeRoot
): TypeNode =>
    l.degenerate || r.degenerate
        ? degenerateOperation(operator, l, r, scope)
        : casesOperation(l, r, scope)

const casesOperation = (
    l: TypeCases,
    r: TypeCases,
    scope: ScopeRoot
): TypeNode => {
    const result: TypeCases = {}
    let caseKey: TypeName
    for (caseKey in l) {
        if (hasKey(r, caseKey)) {
        }
    }
    return isEmpty(result)
        ? {
              degenerate: "never",
              // TODO: Delegate based on k
              reason: `${JSON.stringify(l)} and ${JSON.stringify(
                  r
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
