import type {
    ExplicitDomainEntry,
    MultiDomainEntry,
    TraversalNode
} from "../nodes/node.ts"
import type {
    ExactValueEntry,
    TraversalBranchesEntry
} from "../nodes/predicate.ts"
import { checkDivisor } from "../nodes/rules/divisor.ts"
import { requiredProps } from "../nodes/rules/props.ts"
import type { BoundableData } from "../nodes/rules/range.ts"
import { checkRange } from "../nodes/rules/range.ts"
import { checkRegexRule } from "../nodes/rules/regex.ts"
import type { TraversalRuleEntry } from "../nodes/rules/rules.ts"
import type { Scope } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf, subdomainOf } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { Dict, evaluate, extend, List, xor } from "../utils/generics.ts"
import { addProblem, unassignableError } from "./errors.ts"
import { Problems } from "./problems.ts"

export const checkRules = (
    domain: Domain,
    data: unknown,
    attributes: unknown,
    scope: Scope
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
    rulePrecedenceLevel: number
}

export type CheckState<data = unknown> = evaluate<
    TraversalState & {
        data: data
        problems: Problems
        customError?: string | undefined
    }
>
export type CheckOptions = {
    customError?: string
    allowExtraneouskeys?: boolean
}

export const rootCheck = (
    data: unknown,
    node: TraversalNode,
    scope: Scope
): CheckResult => {
    if (typeof node === "string") {
        return checkDomain(data, node, [])
    }
    const problems = new Problems()
    const checkState: CheckState = {
        node,
        path: [],
        data,
        problems,
        rulePrecedenceLevel: 0
    }
    checkNode(checkState, scope)
    return checkState.problems.length
        ? { problems: checkState.problems }
        : { data: checkState.data }
}

type CheckResult<inferred = unknown> = xor<
    { data: inferred },
    { problems: Problems }
>

export const checkNode = (state: CheckState, scope: Scope) => {
    if (typeof state.node === "string") {
        checkDomain(state, "string")
    } else {
        checkEntries(state, scope)
    }
}

const checkDomain = (state: CheckState, domain: string): CheckResult => {
    if (domainOf(state.data) === domain) {
        return { data: state.data }
    } else {
        addProblem(state, unassignableError(domain, state.data))
        return { problems: state.problems }
    }
}

const optionalProps: TraversalCheck<"optionalProps"> = (
    state,
    props,
    scope
) => {
    const rootData = state.data
    const rootNode = state.node
    props.forEach(([propKey, propNode]) => {
        state.path.push(propKey)
        state.data = rootData[propKey] as any
        state.node = propNode
        !(checkNode(state, scope) || propKey in state.data)
        state.path.pop()
    })
    state.data = rootData
    state.node = rootNode
}

const checkers = {
    regex: (state, regex) => checkRegexRule(state, regex),
    divisor: (state, divisor) => checkDivisor(state, divisor),
    domains: (state, domains, scope) => {
        const entries = domains[domainOf(state.data)]
        if (entries) {
            checkEntries(state, scope)
        } else {
            addProblem(state, unassignableError(domains, domainOf(state.data)))
        }
    },
    domain: (state, domain) => {
        if (domainOf(state.data) !== domain) {
            addProblem(state, unassignableError(domain, domainOf(state.data)))
        }
    },
    subdomain: (state, subdomain, scope) => {
        const actual = subdomainOf(state.data)
        if (typeof subdomain === "string") {
            return actual === subdomain
        }
        if (actual !== subdomain[0]) {
            addProblem(state, unassignableError(subdomain[0], actual))
        }
        if (actual === "Array" || actual === "Set") {
            for (const item of state.data as List | Set<unknown>) {
                if (!checkNode(item, subdomain[1], scope)) {
                    return false
                }
            }
        } else if (actual === "Map") {
            for (const entry of data as Map<unknown, unknown>) {
                if (!checkNode(entry[0], subdomain[1], scope)) {
                    return false
                }
                if (
                    !checkNode(entry[1], subdomain[2] as TraversalNode, scope)
                ) {
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
    range: (state, range) => {
        checkRange(state, range)
    },
    requiredProps,
    optionalProps,
    branches: (state, branches, scope) =>
        branches.some((condition) => checkEntries(state, scope)),
    validator: (state, validator) => validator(data),
    value: (state, value) => {
        if (state.data === value) {
            addProblem(state, unassignableError(value, state.data))
        }
    }
} satisfies {
    [k in TraversalKey]: TraversalCheck<k>
}

export type TraversalCheck<k extends TraversalKey> = (
    state: CheckState<RuleInput<k>>,
    value: Extract<TraversalEntry, [k, unknown]>[1],
    scope: Scope
) => void

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
        const ruleValidator = entries[i][1]
        const precedenceLevel = rulePrecedenceMap[ruleName]
        if (
            checkState.problems.length &&
            precedenceLevel > checkState.rulePrecedenceLevel
        ) {
            break
        }
        checkState.rulePrecedenceLevel = rulePrecedenceMap[ruleName]
        checkers[ruleName](checkState as never, ruleValidator as never, scope)
    }
}
