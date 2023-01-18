import type { OperationContext } from "../nodes/compose.ts"
import type {
    ExplicitDomainEntry,
    MultiDomainEntry,
    TraversalNode
} from "../nodes/node.ts"
import type {
    ExactValueEntry,
    TraversalBranchesEntry
} from "../nodes/predicate.ts"
import { checkClass } from "../nodes/rules/class.ts"
import { checkDivisor } from "../nodes/rules/divisor.ts"
import { checkOptionalProps, checkRequiredProps } from "../nodes/rules/props.ts"
import type { BoundableData } from "../nodes/rules/range.ts"
import { checkRange } from "../nodes/rules/range.ts"
import { checkRegex } from "../nodes/rules/regex.ts"
import type { Rules, TraversalRuleEntry } from "../nodes/rules/rules.ts"
import { precedenceMap } from "../nodes/rules/rules.ts"
import { checkSubdomain } from "../nodes/rules/subdomain.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import type { Dict, evaluate, extend, xor } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { ProblemCode, ProblemMessageWriter } from "./problems.ts"
import { Problems, Stringifiable } from "./problems.ts"

export const checkRules = (
    domain: Domain,
    data: unknown,
    rules: Rules,
    context: OperationContext
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
    problems?: ProblemsOptions
}

export type ProblemsOptions = {
    [code in ProblemCode]?: BaseProblemOptions<code>
}
export type BaseProblemOptions<code extends ProblemCode> =
    | ProblemMessageWriter<code>
    | {
          message?: ProblemMessageWriter<code>
      }

export const rootCheck = (
    data: unknown,
    node: TraversalNode,
    scope: ScopeRoot,
    config: CheckConfig = {}
): CheckResult => {
    if (typeof node === "string") {
        return baseCheckDomain(data, node, [])
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

export const checkNode = (state: CheckState, $: ScopeRoot) => {
    if (typeof state.node === "string") {
        if (domainOf(state.data) !== state.node) {
            state.problems.addProblem(
                "domain",
                {
                    expected: [state.node]
                },
                state
            )
        }
        return
    }
    checkEntries(state, $)
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
                  path: path.join("/"),
                  reason: `${domain} !== ${data}`
              })
          }

const checkers = {
    regex: checkRegex,
    divisor: checkDivisor,
    domains: (state, domains, scope) => {
        const entries = domains[domainOf(state.data)]
        if (entries) {
            state.path.push(domainOf(state.data))
            state.node = entries as TraversalNode
            checkEntries(state, scope)
        } else {
            state.problems.addProblem(
                "domain",
                {
                    expected: keysOf(domains)
                },
                state
            )
        }
    },
    domain: (state, domain) => {
        if (domainOf(state.data) !== domain) {
            state.problems.addProblem(
                "domain",
                {
                    expected: [domain]
                },
                state
            )
        }
    },
    subdomain: checkSubdomain,
    range: checkRange,
    requiredProps: checkRequiredProps,
    optionalProps: checkOptionalProps,
    branches: (state, branches, scope) =>
        branches.some((condition) => {
            state.node = condition as TraversalNode
            checkEntries(state, scope)
            return state.problems.length === 0 ? true : false
        }),
    class: checkClass,
    // TODO: add error message syntax.
    narrow: (state, validator) => validator(state),
    value: (state, value) => {
        if (state.data !== value) {
            state.problems.addProblem(
                "value",
                {
                    expected: new Stringifiable(value)
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
    let precedenceLevel = 0
    for (let i = 0; i < entries.length; i++) {
        const ruleName = entries[i][0]
        const ruleValidator = entries[i][1]
        if (
            // TODO: path string
            checkState.problems.byPath[checkState.path.join("/")] &&
            precedenceMap[ruleName] > precedenceLevel
        ) {
            break
        }
        checkers[ruleName](checkState as never, ruleValidator as never, scope)
        precedenceLevel = precedenceMap[ruleName]
    }
}
