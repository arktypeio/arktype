import type { CheckState, TraversalCheck } from "../../traverse/check.ts"
import { checkNode } from "../../traverse/check.ts"
import type {
    defineProblem,
    ProblemMessageWriter
} from "../../traverse/problems.ts"
import type { Subdomain } from "../../utils/domains.ts"
import { subdomainOf } from "../../utils/domains.ts"
import { throwInternalError } from "../../utils/errors.ts"
import type { Dict, List } from "../../utils/generics.ts"
import { stringSerialize } from "../../utils/serialize.ts"
import {
    composeIntersection,
    disjoint,
    equality,
    isDisjoint,
    isEquality
} from "../compose.ts"
import type { TraversalNode, TypeNode } from "../node.ts"
import { compileNode, nodeIntersection } from "../node.ts"
import type { FlattenAndPushRule } from "./rules.ts"

// Unfortunately we can't easily abstract between these two rules because of
// nonsense TS circular reference issues.
export type SubdomainRule<$ = Dict> =
    | Subdomain
    | ["Array", TypeNode<$>]
    | ["Array", TypeNode<$>, number]
    | ["Set", TypeNode<$>]
    | ["Map", TypeNode<$>, TypeNode<$>]

export type TraversalSubdomainRule =
    | Subdomain
    | ["Array", TraversalNode]
    | ["Array", TraversalNode, number]
    | ["Set", TraversalNode]
    | ["Map", TraversalNode, TraversalNode]

const isTupleRule = <rule extends List>(
    rule: rule
): rule is Extract<rule, ["Array", unknown, number]> =>
    typeof rule[2] === "number"

export const compileSubdomain: FlattenAndPushRule<SubdomainRule> = (
    entries,
    rule,
    $
) =>
    entries.push([
        "subdomain",
        typeof rule === "string"
            ? rule
            : ([
                  rule[0],
                  compileNode(rule[1], $),
                  ...(rule.length === 3
                      ? [
                            typeof rule[2] === "number"
                                ? rule[2]
                                : compileNode(rule[2], $)
                        ]
                      : [])
              ] as TraversalSubdomainRule)
    ])

export const subdomainIntersection = composeIntersection<SubdomainRule>(
    (l, r, context) => {
        if (typeof l === "string") {
            if (typeof r === "string") {
                return l === r
                    ? equality()
                    : disjoint("subdomain", l, r, context)
            }
            return l === r[0] ? r : disjoint("subdomain", l, r[0], context)
        }
        if (typeof r === "string") {
            return l[0] === r ? l : disjoint("subdomain", l[0], r, context)
        }
        if (l[0] !== r[0]) {
            return disjoint("subdomain", l[0], r[0], context)
        }
        const result = [l[0]] as unknown as Exclude<SubdomainRule, string>
        if (isTupleRule(l)) {
            if (isTupleRule(r) && l[2] !== r[2]) {
                return disjoint("tupleLength", l[2], r[2], context)
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
            const parameterResult = nodeIntersection(lNode, rNode, context)
            if (isEquality(parameterResult)) {
                result[i] = lNode
            } else if (parameterResult === l) {
                result[i] = lNode
                rImpliesL = false
            } else if (parameterResult === r) {
                result[i] = rNode
                lImpliesR = false
            } else {
                result[i] = isDisjoint(parameterResult)
                    ? "never"
                    : parameterResult
                lImpliesR = false
                rImpliesL = false
            }
        }
        return lImpliesR ? (rImpliesL ? equality() : l) : rImpliesL ? r : result
    }
)

export const checkSubdomain: TraversalCheck<"subdomain"> = (
    state,
    rule,
    scope
) => {
    const dataSubdomain = subdomainOf(state.data)
    if (typeof rule === "string") {
        if (dataSubdomain !== rule) {
            state.problems.addProblem(
                "domain",
                {
                    expected: [rule]
                },
                state
            )
        }
        return
    }
    if (dataSubdomain !== rule[0]) {
        state.problems.addProblem(
            "domain",
            {
                expected: [rule[0]]
            },
            state
        )
        return
    }
    if (dataSubdomain === "Array" && typeof rule[2] === "number") {
        const actual = (state.data as List).length
        const expected = rule[2]
        if (expected !== actual) {
            return state.problems.addProblem(
                "tupleLength",
                {
                    actual,
                    expected
                },
                state as CheckState<List>
            )
        }
    }
    if (dataSubdomain === "Array" || dataSubdomain === "Set") {
        const rootData = state.data
        const rootNode = state.node
        state.node = rule[1]
        for (const item of state.data as List | Set<unknown>) {
            state.data = item
            state.path.push(`${item}`)
            checkNode(state, scope)
            state.path.pop()
        }
        state.data = rootData
        state.node = rootNode
    } else {
        return throwInternalError(
            `Unexpected subdomain entry ${stringSerialize(rule)}`
        )
    }
    return true
}

export type TupleLengthProblemContext = defineProblem<
    List,
    {
        actual: number
        expected: number
    }
>

export const writeTupleLengthError: ProblemMessageWriter<"tupleLength"> = ({
    actual,
    expected
}) => `Tuple must have length ${expected} (was ${actual})`
