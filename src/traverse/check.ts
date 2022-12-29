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
import { checkOptionalProps, checkRequiredProps } from "../nodes/rules/props.ts"
import type { BoundableData } from "../nodes/rules/range.ts"
import { checkRange } from "../nodes/rules/range.ts"
import { checkRegexRule } from "../nodes/rules/regex.ts"
import { TraversalRuleEntry, rulePrecedenceMap } from "../nodes/rules/rules.ts"
import { checkSubdomain } from "../nodes/rules/subdomain.ts"
import type { Scope } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf, subdomainOf } from "../utils/domains.ts"
import type { Dict, evaluate, extend, xor } from "../utils/generics.ts"
import { Problems } from "./problems.ts"

export const checkRules = (
    domain: Domain,
    data: unknown,
    attributes: unknown,
    scope: Scope
) => {
    return true
}

const precedenceMap: {
    readonly [k in TraversalEntry[0]]-?: number
} = { domain: 0, value: 0, domains: 0, branches: 0, ...rulePrecedenceMap }

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
        checkDomain(state.data, state.node, state.path)
    }
    checkEntries(state, scope)
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

const checkers = {
    regex: (state, regex) => checkRegexRule(state, regex),
    divisor: (state, divisor) => checkDivisor(state, divisor),
    domains: (state, domains, scope) => {
        const entries = domains[domainOf(state.data)]
        if (entries) {
            checkEntries(state, scope)
        } else {
            state.problems.addProblem(state, {
                actual: domainOf(state.data),
                expected: domains
            })
        }
    },
    domain: (state, domain) => {
        if (domainOf(state.data) !== domain) {
            state.problems.addProblem(state, {
                actual: domainOf(state.data),
                expected: domain
            })
        }
    },
    subdomain: (state, subdomain, scope) =>
        checkSubdomain(state, subdomain, scope),
    range: (state, range) => {
        checkRange(state, range)
    },
    requiredProps: checkRequiredProps,
    optionalProps: checkOptionalProps,
    branches: (state, branches, scope) =>
        branches.some((condition) => checkEntries(state, scope)),
    refinement: (state, validator) => validator(state),
    value: (state, value) => {
        if (state.data !== value) {
            state.problems.addProblem(state, {
                actual: state.data,
                expected: value
            })
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

export const checkEntries = (checkState: CheckState, scope: Scope) => {
    const entries = checkState.node as TraversalEntry[]
    let precedenceLevel = 0
    for (let i = 0; i < checkState.node?.length; i++) {
        const ruleName = entries[i][0]
        const ruleValidator = entries[i][1]
        if (
            checkState.problems.byPath[ruleName] &&
            precedenceMap[ruleName] > precedenceLevel
        ) {
            break
        }
        precedenceLevel = precedenceMap[ruleName]
        checkers[ruleName](checkState as never, ruleValidator as never, scope)
    }
}
