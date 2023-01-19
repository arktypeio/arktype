import type { TraversalCheck } from "../../traverse/check.ts"
import { checkNode } from "../../traverse/check.ts"
import type {
    defineProblem,
    ProblemMessageWriter
} from "../../traverse/problems.ts"
import type { Subdomain } from "../../utils/domains.ts"
import { subdomainOf } from "../../utils/domains.ts"
import { throwInternalError } from "../../utils/errors.ts"
import type { Dict, List } from "../../utils/generics.ts"
import { pushKey, withoutLastKey } from "../../utils/paths.ts"
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
                    : disjoint("subdomain", [l, r], context)
            }
            return l === r[0] ? r : disjoint("subdomain", [l, r[0]], context)
        }
        if (typeof r === "string") {
            return l[0] === r ? l : disjoint("subdomain", [l[0], r], context)
        }
        if (l[0] !== r[0]) {
            return disjoint("subdomain", [l[0], r[0]], context)
        }
        const result = [l[0]] as unknown as Exclude<SubdomainRule, string>
        if (isTupleRule(l)) {
            if (isTupleRule(r) && l[2] !== r[2]) {
                return disjoint("tupleLength", [l[2], r[2]], context)
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
            context.path = pushKey(
                context.path,
                subdomainParameterToPathSegment(l[0], i)
            )
            const parameterResult = nodeIntersection(lNode, rNode, context)
            context.path = withoutLastKey(context.path)
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

export const checkSubdomain: TraversalCheck<"subdomain"> = (
    data,
    rule,
    state
) => {
    const dataSubdomain = subdomainOf(data)
    if (typeof rule === "string") {
        if (dataSubdomain !== rule) {
            state.problems.addProblem(
                "domain",
                data,
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
            data,
            {
                expected: [rule[0]]
            },
            state
        )
        return
    }
    if (dataSubdomain === "Array" && typeof rule[2] === "number") {
        const actual = (data as List).length
        const expected = rule[2]
        if (expected !== actual) {
            // TODO: addProblem API to state? Could all be one object
            return state.problems.addProblem(
                "tupleLength",
                data,
                {
                    actual,
                    expected
                },
                state
            )
        }
    }
    if (dataSubdomain === "Array" || dataSubdomain === "Set") {
        let i = 0
        const rootPath = state.path
        for (const item of data as List | Set<unknown>) {
            // TODO: add path APIs to state
            state.path = pushKey(rootPath, `${i}`)
            checkNode(item, rule[1], state)
            i++
        }
        state.path = rootPath
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
