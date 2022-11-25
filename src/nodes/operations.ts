import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import { hasKey } from "../utils/generics.js"
import { degenerateOperation } from "./degenerate.js"
import type { DataType, Node, NodeTypes } from "./node.js"
import type { AttributeIntersection } from "./shared.js"

export type NodeOperator = "&" | "-"

export const intersection: AttributeIntersection<Node, ScopeRoot> = (
    l,
    r,
    scope
) => operation("&", l, r, scope)

export const difference: AttributeIntersection<Node, ScopeRoot> = (
    l,
    r,
    scope
) => operation("-", l, r, scope)

export const operation = (
    operator: NodeOperator,
    l: Node,
    r: Node,
    scope: ScopeRoot
): Node =>
    l.degenerate || r.degenerate
        ? degenerateOperation(operator, l, r, scope)
        : casesOperation(operator, l, r, scope)

const casesOperation = (
    operator: NodeOperator,
    l: NodeTypes,
    r: NodeTypes,
    scope: ScopeRoot
): Node => {
    const result: mutable<NodeTypes> = {}
    let caseKey: DataType
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
