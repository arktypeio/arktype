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
    | readonly ["Array", TypeNode<$>]
    | readonly ["Set", TypeNode<$>]
    | readonly ["Map", TypeNode<$>, TypeNode<$>]

export type TraversalSubdomainRule =
    | Subdomain
    | readonly ["Array", TraversalNode]
    | readonly ["Array", TraversalNode]
    | readonly ["Set", TraversalNode]
    | readonly ["Map", TraversalNode, TraversalNode]

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
        let lImpliesR = true
        let rImpliesL = true
        for (let i = 1; i < l.length; i++) {
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
): SubdomainPathSegment =>
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

export const subdomainPathSegments = {
    "${number}": true,
    "${item}": true,
    "${key}": true,
    "${value}": true
} as const

export type SubdomainPathSegment = keyof typeof subdomainPathSegments

export const flattenSubdomain: FlattenAndPushRule<SubdomainRule> = (
    entries,
    rule,
    ctx
) =>
    entries.push([
        "subdomain",
        typeof rule === "string"
            ? rule
            : rule[0] === "Map"
            ? [rule[0], flattenNode(rule[1], ctx), flattenNode(rule[2], ctx)]
            : [rule[0], flattenNode(rule[1], ctx)]
    ])
