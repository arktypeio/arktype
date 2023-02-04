import type { Subdomain } from "../../utils/domains.ts"
import { throwInternalError } from "../../utils/errors.ts"
import type { Dict, List, mutable } from "../../utils/generics.ts"
import {
    composeIntersection,
    equality,
    isDisjoint,
    isEquality
} from "../compose.ts"
import type { TraversalNode, TypeNode } from "../node.ts"
import { flattenNode, nodeIntersection } from "../node.ts"
import type { FlattenAndPushRule } from "./rules.ts"

// Unfortunately we can't easily abstract between these two rules because of
// nonsense TS circular reference issues.
export type SubdomainRule<$ = Dict> =
    | Subdomain
    | readonly ["Array", TypeNode<$>]
    | readonly ["Array", TypeNode<$>, number]
    | readonly ["Set", TypeNode<$>]
    | readonly ["Map", TypeNode<$>, TypeNode<$>]

export type TraversalSubdomainRule =
    | Subdomain
    | readonly ["Array", TraversalNode]
    | readonly ["Array", TraversalNode, number]
    | readonly ["Set", TraversalNode]
    | readonly ["Map", TraversalNode, TraversalNode]

const isTupleRule = <rule extends List>(
    rule: rule
): rule is Extract<rule, ["Array", unknown, number]> =>
    typeof rule[2] === "number"

export const subdomainIntersection = composeIntersection<SubdomainRule>(
    (l, r, state) => {
        if (typeof l === "string") {
            if (typeof r === "string") {
                return l === r
                    ? equality()
                    : state.addDisjoint("subdomain", l, r)
            }
            return l === r[0] ? r : state.addDisjoint("subdomain", l, r[0])
        }
        if (typeof r === "string") {
            return l[0] === r ? l : state.addDisjoint("subdomain", l[0], r)
        }
        if (l[0] !== r[0]) {
            return state.addDisjoint("subdomain", l[0], r[0])
        }
        const result = [l[0]] as unknown as mutable<
            Exclude<SubdomainRule, string>
        >
        if (isTupleRule(l)) {
            if (isTupleRule(r) && l[2] !== r[2]) {
                return state.addDisjoint("tupleLength", l[2], r[2])
            }
            result[2] = l[2]
        } else if (isTupleRule(r)) {
            result[2] = r[2]
        }
        let lImpliesR = true
        let rImpliesL = true
        const maxNodeIndex = l[0] === "Map" ? 2 : 1
        for (let i = 1; i <= maxNodeIndex; i++) {
            const lNode = l[i] as TypeNode
            const rNode = r[i] as TypeNode
            state.path.push(subdomainParameterToPathSegment(l[0], i))
            const parameterResult = nodeIntersection(lNode, rNode, state)
            state.path.pop()
            if (isEquality(parameterResult)) {
                result[i] = lNode
            } else if (parameterResult === l) {
                result[i] = lNode
                rImpliesL = false
            } else if (parameterResult === r) {
                result[i] = rNode
                lImpliesR = false
            } else if (isDisjoint(parameterResult)) {
                return parameterResult
            } else {
                result[i] = parameterResult
                lImpliesR = false
                rImpliesL = false
            }
        }
        return lImpliesR ? (rImpliesL ? equality() : l) : rImpliesL ? r : result
    }
)

type ParameterizableSubdomainRuleName = Extract<SubdomainRule, List>[0]

const subdomainParameterToPathSegment = (
    subdomain: ParameterizableSubdomainRuleName,
    i: number
) =>
    subdomain === "Array"
        ? "${number}"
        : subdomain === "Set"
        ? "${item}"
        : subdomain === "Map"
        ? i === 1
            ? "${key}"
            : "${value}"
        : throwInternalError(
              `Unexpected parameterized subdomain '${subdomain}'`
          )

export const flattenSubdomain: FlattenAndPushRule<SubdomainRule> = (
    entries,
    rule,
    ctx
) =>
    entries.push([
        "subdomain",
        typeof rule === "string"
            ? rule
            : ([
                  rule[0],
                  flattenNode(rule[1], ctx.type),
                  ...(rule.length === 3
                      ? [
                            typeof rule[2] === "number"
                                ? rule[2]
                                : flattenNode(rule[2], ctx.type)
                        ]
                      : [])
              ] as any)
    ])
