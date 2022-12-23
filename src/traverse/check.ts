import type {
    ExplicitDomainEntry,
    MultiDomainEntry,
    TraversalNode
} from "../nodes/node.js"
import type {
    ExactValueEntry,
    TraversalBranchesEntry
} from "../nodes/predicate.js"
import { checkDivisor } from "../nodes/rules/divisor.js"
import type { BoundableData } from "../nodes/rules/range.js"
import { checkRange } from "../nodes/rules/range.js"
import { checkRegexRule } from "../nodes/rules/regex.js"
import type { TraversalRuleEntry } from "../nodes/rules/rules.js"
import { rulePrecedenceMap } from "../nodes/rules/rules.js"
import type { ScopeRoot } from "../scope.js"
import type { CheckOptions } from "../type.js"
import type { Domain } from "../utils/domains.js"
import { domainOf, subdomainOf } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { Dict, evaluate, extend, List, xor } from "../utils/generics.js"
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
    rulePrecedenceLevel: number
}

export type CheckState<data = unknown> = evaluate<
    TraversalState & {
        data: data
        problems: Problems
        customError?: string | undefined
    }
>

//TODO name
export const rootCheck = (
    data: unknown,
    node: TraversalNode,
    scope: ScopeRoot,
    checkOptions: CheckOptions
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
        rulePrecedenceLevel: 0,
        customError: checkOptions.customError
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

export const checkNode = (checkState: CheckState, scope: ScopeRoot) => {
    if (typeof checkState.node === "string") {
        const domainCheckResult = checkDomain(
            checkState.data,
            checkState.node,
            checkState.path
        )
        if (domainCheckResult.problems) {
            checkState.problems.push(domainCheckResult.problems[0])
        }
    }

    checkEntries(checkState, scope)
}

const checkDomain = (
    data: unknown,
    domain: string,
    path: string[]
): CheckResult =>
    domainOf(data) === domain
        ? { data }
        : {
              problems: new Problems({
                  path: path.join("."),
                  reason: `${domain} !== ${data}`
              })
          }

const addError = (state: CheckState, comparitor: unknown, data: unknown) => {
    state.problems.push({
        path: state.path.join(),
        reason: `${data}-${comparitor} are not equivalent`
    })
}

//move
const requiredProps: TraversalCheck<"requiredProps"> = (
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
        checkNode(state, scope)
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
            addError(state, domains, domainOf(state.data))
        }
    },
    domain: (state, domain) => {
        if (domainOf(state.data) !== domain) {
            addError(state, domain, domainOf(state.data))
        }
    },
    subdomain: (state, subdomain, scope) => {
        const actual = subdomainOf(state.data)
        if (typeof subdomain === "string") {
            return actual === subdomain
        }
        if (actual !== subdomain[0]) {
            return false
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
    optionalProps: (state, props, scope) =>
        props.every(
            ([propKey, propNode]) =>
                !(propKey in data) || checkNode(data[propKey], propNode, scope)
        ),
    branches: (state, branches, scope) =>
        branches.some((condition) => checkEntries(data, condition, scope)),
    validator: (state, validator) => validator(data),
    value: (state, value) => {
        if (state.data === value) {
            state.path.push("value")
            addError(state, value, state.data)
        }
    }
} satisfies {
    [k in TraversalKey]: TraversalCheck<k>
}

export type TraversalCheck<k extends TraversalKey> = (
    state: CheckState<RuleInput<k>>,
    value: Extract<TraversalEntry, [k, unknown]>[1],
    scope: ScopeRoot
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
        const ruleValidator = entries[i][1] as never
        const precedenceLevel = rulePrecedenceMap[ruleName]
        //CUREENT PANATH
        if (
            checkState.problems.length &&
            precedenceLevel > checkState.rulePrecedenceLevel
        ) {
            break
        }
        checkState.rulePrecedenceLevel = rulePrecedenceMap[ruleName]
        // checkState.path.push(`${entries[i][0]},${entries[i][1]}`)
        checkers[ruleName](checkState as never, ruleValidator, scope)
        // checkState.path.pop()
    }
}
