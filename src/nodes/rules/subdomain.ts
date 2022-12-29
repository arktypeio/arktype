import { Scope } from "../../scope.ts"
import { CheckState, TraversalCheck, checkNode } from "../../traverse/check.ts"
import { Subdomain, subdomainOf } from "../../utils/domains.ts"
import { throwInternalError } from "../../utils/errors.ts"
import { List } from "../../utils/generics.ts"
import { composeIntersection, empty, equal } from "../compose.ts"
import { nodeIntersection } from "../intersection.ts"
import type { TraversalNode, TypeNode } from "../node.ts"
import { compileNode } from "../node.ts"
import type { PredicateContext } from "../predicate.ts"
import type { FlattenAndPushRule } from "./rules.ts"

// Unfortunately we can't easily abstract between these two rules because of
// nonsense TS circular reference issues.
export type SubdomainRule<alias extends string = string> =
    | Subdomain
    | ["Array", TypeNode<alias>]
    | ["Set", TypeNode<alias>]
    | ["Map", TypeNode<alias>, TypeNode<alias>]

export type TraversalSubdomainRule =
    | Subdomain
    | ["Array", TraversalNode]
    | ["Set", TraversalNode]
    | ["Map", TraversalNode, TraversalNode]

export const compileSubdomain: FlattenAndPushRule<SubdomainRule> = (
    entries,
    rule,
    scope
) => {
    if (typeof rule === "string") {
        entries.push(["subdomain", rule])
    } else {
        const compiled: [Subdomain, ...TraversalNode[]] = [rule[0]]
        for (let i = 1; i < rule.length; i++) {
            compiled.push(compileNode(rule[i], scope))
        }
        entries.push(["subdomain", compiled as TraversalSubdomainRule])
    }
}

export const subdomainIntersection = composeIntersection<
    SubdomainRule,
    PredicateContext
>((l, r, context) => {
    if (typeof l === "string") {
        if (typeof r === "string") {
            return l === r ? equal : empty
        }
        return l === r[0] ? r : empty
    }
    if (typeof r === "string") {
        return l[0] === r ? l : empty
    }
    if (l[0] !== r[0]) {
        return empty
    }
    const result: [Subdomain, ...TypeNode[]] = [l[0]]
    let lImpliesR = true
    let rImpliesL = true
    for (let i = 1; i < l.length; i++) {
        const parameterResult = nodeIntersection(l[i], r[i], context.scope)
        if (parameterResult === equal) {
            result.push(l[i])
        } else if (parameterResult === l) {
            result.push(l[i])
            rImpliesL = false
        } else if (parameterResult === r) {
            result.push(r[i])
            lImpliesR = false
        } else {
            result.push(parameterResult === empty ? "never" : parameterResult)
            lImpliesR = false
            rImpliesL = false
        }
    }
    return lImpliesR
        ? rImpliesL
            ? equal
            : l
        : rImpliesL
        ? r
        : (result as SubdomainRule)
})

export const checkSubdomain: TraversalCheck<"subdomain"> = (
    state,
    subdomain,
    scope
) => {
    const actual = subdomainOf(state.data)
    if (typeof subdomain === "string") {
        if (actual !== subdomain) {
            state.problems.addProblem(state, {
                actual,
                expected: subdomain
            })
        }
        return
    }
    if (actual !== subdomain[0]) {
        state.problems.addProblem(state, { actual, expected: subdomain[0] })
        return
    }
    if (actual === "Array" || actual === "Set") {
        const rootData = state.data
        const rootNode = state.node
        state.node = subdomain[1]
        for (const item of state.data as List | Set<unknown>) {
            state.data = item
            state.path.push(`${item}`)
            checkNode(state, scope)
            state.path.pop()
        }
        state.data = rootData
        state.node = rootNode
    } else if (actual === "Map") {
        const rootData = state.data
        const rootNode = state.node
        for (const entry of state.data as Map<unknown, unknown>) {
            checkNode({ ...state, data: entry[0], node: subdomain[1] }, scope)
            if (state.problems.length) {
                return
            }
            checkNode(
                {
                    ...state,
                    data: entry[1],
                    node: subdomain[2] as TraversalNode
                },
                scope
            )
            if (state.problems.length) {
                return
            }
        }
        state.data = rootData
        state.node = rootNode
    } else {
        return throwInternalError(
            `Unexpected subdomain entry ${JSON.stringify(subdomain)}`
        )
    }
    return true
}
