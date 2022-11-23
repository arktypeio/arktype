import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
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
        : casesOperation(operator, l, r, scope)

const casesOperation = (
    operator: NodeOperator,
    l: TypeCases,
    r: TypeCases,
    scope: ScopeRoot
): TypeNode => {
    const result: mutable<TypeCases> = {}
    let caseKey: TypeName
    for (caseKey in l) {
        if (hasKey(r, caseKey)) {
            result[caseKey] = l[caseKey] as any
        } else if (operator === "-") {
            result[caseKey] = l[caseKey] as any
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
