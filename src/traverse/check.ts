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
import type { TraversalRuleEntry } from "../nodes/rules/rules.ts"
import { rulePrecedenceMap } from "../nodes/rules/rules.ts"
import { checkSubdomain } from "../nodes/rules/subdomain.ts"
import type { Scope } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf, subdomainOf } from "../utils/domains.ts"
import type { Dict, evaluate, extend, xor } from "../utils/generics.ts"
import type { DiagnosticCode, DiagnosticsByCode } from "./problems.ts"
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

export type TraversalState = {
    node: TraversalNode
    path: string[]
}

export type CheckState<data = unknown> = evaluate<
    TraversalState & {
        data: data
        problems: Problems
        config: CheckConfig
    }
>

export type CheckConfig = {
    problems?: OptionsByDiagnostic
}

export type OptionsByDiagnostic = {
    [Code in DiagnosticCode]?: BaseDiagnosticOptions<Code>
}
export type BaseDiagnosticOptions<Code extends keyof DiagnosticsByCode> = {
    message: (context: DiagnosticsByCode[Code]) => string
}

export const rootCheck = (
    data: unknown,
    node: TraversalNode,
    scope: Scope,
    config: CheckConfig = {}
): CheckResult => {
    if (typeof node === "string") {
        return baseCheckDomain(data, node, [])
    }
    //TODOSHAWN maybe a way we can preemptively check for Unassignable
    const a = c(data, node, [])
    if ("problems" in a!) {
        return a
    }
    const problems = new Problems()
    const checkState: CheckState = {
        node,
        path: [],
        data,
        problems,
        config
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
    //TODOSHAWN: feels wrong
    const base = state.node[0][0]
    if (typeof state.node === "string") {
        checkDomain(state)
        return
    } else if (base === "subdomain") {
        //TODOSHAWN maybe clean
        if (
            state.node[1]?.[0] === "requiredProps" &&
            state.node[1][1].length !== (state.data as []).length
        ) {
            state.problems.addProblem(
                "TupleLength",
                {
                    expectedLength: state.node[1][1].length
                },
                state
            )
            return
        }
    }
    checkEntries(state, scope)
}

const checkDomain = (state: CheckState) => {
    if (domainOf(state.data) !== state.node) {
        state.problems.addProblem(
            "Unassignable",
            {
                expected: state.node
            },
            state
        )
    }
}

const baseCheckDomain = (
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

const c = (data: unknown, domain: unknown, path: string[]) => {
    if (typeof domain === "string") {
        if (domain !== domainOf(data)) {
            return {
                problems: new Problems({
                    path: path.join("."),
                    reason: `data must be of type string (was ${domainOf(
                        data
                    )})`
                })
            }
        }
    }
    if (subdomainOf(domain) === "Array") {
        if (domain[0][0] === "domains") {
            const keys = Object.keys(domain[0][1])
            const assignable = keys.some((domain) => domainOf(data) === domain)
            if (!assignable) {
                return {
                    problems: new Problems({
                        path: path.join("."),
                        reason: `data must by type of ${keys.join(
                            "|"
                        )} (was ${domainOf(data)})`
                    })
                }
            }
        }
    }
    return {}
}
const checkers = {
    regex: (state, regex) => checkRegexRule(state, regex),
    divisor: (state, divisor) => checkDivisor(state, divisor),
    domains: (state, domains, scope) => {
        const entries = domains[domainOf(state.data)]
        if (entries) {
            state.path.push(domainOf(state.data))
            state.node = entries as TraversalNode
            checkEntries(state, scope)
        } else {
            state.problems.addProblem(
                "Union",
                {
                    type: state.node
                },
                state
            )
        }
    },
    domain: (state, domain) => {
        if (domainOf(state.data) !== domain) {
            state.problems.addProblem(
                "Unassignable",
                {
                    expected: domain
                },
                state
            )
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
        branches.some((condition) => {
            state.node = condition as TraversalNode
            checkEntries(state, scope)
            return state.problems.length === 0 ? true : false
        }),
    refinement: (state, validator) => validator(state),
    value: (state, value) => {
        if (state.data !== value) {
            state.problems.addProblem(
                "Unassignable",
                {
                    expected: value
                },
                state
            )
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
    for (let i = 0; i < entries.length; i++) {
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
