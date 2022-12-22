import type {
    ExplicitDomainEntry,
    MultiDomainEntry,
    TraversalNode
} from "../nodes/node.js"
import type {
    ExactValueEntry,
    TraversalBranchesEntry
} from "../nodes/predicate.js"
import type { BoundableData } from "../nodes/rules/range.js"
import { checkRange } from "../nodes/rules/range.js"
import type { TraversalRuleEntry } from "../nodes/rules/rules.js"
import { rulePrecedenceMap } from "../nodes/rules/rules.js"
import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/domains.js"
import { domainOf, subdomainOf } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { Dict, evaluate, extend, List } from "../utils/generics.js"
import { ruleErrors } from "./errors.js"
import type { Problem } from "./problems.js"
import { Problems } from "./problems.js"

export const checkRules = (
    domain: Domain,
    data: unknown,
    attributes: unknown,
    scope: ScopeRoot
) => {
    return true
}

export type TraversalEntry =
    | MultiDomainEntry
    | ExplicitDomainEntry
    | TraversalRuleEntry
    | ExactValueEntry
    | TraversalBranchesEntry

export type TraversalKey = TraversalEntry[0]

//adding a ruleLevel so that if a problem occurs it should not proceed to the next
export type TraversalState = {
    node: TraversalNode
    path: string[]
    ruleLevel: number
}

export type CheckState<data = unknown> = evaluate<
    TraversalState & {
        data: data
        problems: Problems
    }
>

//TODO name
export const rootCheck = (
    data: unknown,
    node: TraversalNode,
    scope: ScopeRoot
) => {
    const problems = new Problems()
    const checkState: CheckState = {
        node,
        path: [],
        data,
        problems,
        ruleLevel: 0
    }
    check(checkState, scope)
    return checkState
}

//TODO find a better way to do this. Probably just change into if statement and return state
export const check = (checkState: CheckState, scope: ScopeRoot) =>
    typeof checkState.node === "string"
        ? domainOf(checkState.data) === checkState.node
        : checkEntries(checkState, scope)

// If there is an error, we want to call some central API and pass in a context
// specific to the current rule that contains additional information needed to
// construct an error message. This should be used both in the default error
// message implementation and what would be passed to a custom error message
// function if one is provided.

// Checkers need to get the full state so they can make updates specific to the
// rule Keep in mind some rules in the future will set "data" directly to some
// transformation of the input
const checkers = {
    regex: (data, regex) => regex.test(data),
    divisor: (data, divisor) => data % divisor === 0,
    domains: (data, domains, scope) => {
        const entries = domains[domainOf(data)]
        return entries ? checkEntries(data, entries, scope) : false
    },
    domain: (data, domain) => domainOf(data) === domain,
    subdomain: (data, subdomain, scope) => {
        const actual = subdomainOf(data)
        if (typeof subdomain === "string") {
            return actual === subdomain
        }
        if (actual !== subdomain[0]) {
            return false
        }
        if (actual === "Array" || actual === "Set") {
            for (const item of data as List | Set<unknown>) {
                if (!check(item, subdomain[1], scope)) {
                    return false
                }
            }
        } else if (actual === "Map") {
            for (const entry of data as Map<unknown, unknown>) {
                if (!check(entry[0], subdomain[1], scope)) {
                    return false
                }
                if (!check(entry[1], subdomain[2] as TraversalNode, scope)) {
                    return false
                }
            }
        } else {
            return throwInternalError(
                `Unexpected subdomain entry ${JSON.stringify(subdomain)}`
            )
        }
        return true
    },
    range: (data, range) => checkRange(data, range),
    requiredProps: (data, props, scope) =>
        props.every(([propKey, propNode]) =>
            check(data[propKey], propNode, scope)
        ),
    optionalProps: (data, props, scope) =>
        props.every(
            ([propKey, propNode]) =>
                !(propKey in data) || check(data[propKey], propNode, scope)
        ),
    branches: (data, branches, scope) =>
        branches.some((condition) => checkEntries(data, condition, scope)),
    validator: (data, validator) => validator(data),
    value: (data, value) => data === value
} satisfies {
    [k in TraversalKey]: (
        // update to take state instead of data
        // state: CheckState<RuleInput<k>>
        data: RuleInput<k>,
        value: Extract<TraversalEntry, [k, unknown]>[1],
        scope: ScopeRoot
        // Update return type to void
    ) => boolean
}

export type ConstrainedRuleInputs = extend<
    { [k in TraversalKey]?: unknown },
    {
        regex: string
        divisor: number
        range: BoundableData
        requiredProps: Dict
        optionalProps: Dict
    }
>

export type RuleInput<k extends TraversalKey> =
    k extends keyof ConstrainedRuleInputs ? ConstrainedRuleInputs[k] : unknown

export const checkEntries = (checkState: CheckState, scope: ScopeRoot) => {
    const entries = checkState.node as TraversalEntry[]
    for (let i = 0; i < checkState.node?.length; i++) {
        const ruleName = entries[i][0]
        const ruleValidator = entries[i][1] as never
        const currentLevel = rulePrecedenceMap[ruleName]
        if (
            checkState.problems.length &&
            currentLevel !== checkState.ruleLevel
        ) {
            break
        }
        checkState.ruleLevel = rulePrecedenceMap[ruleName]
        if (
            !checkers[ruleName](checkState.data as never, ruleValidator, scope)
        ) {
            const problem: Problem = {
                //TODO keep track of path
                path: ruleName,
                reason: `${ruleErrors[ruleName](
                    checkState.data,
                    ruleValidator
                )}`
            }
            checkState.problems.push(problem)
        }
    }
}
