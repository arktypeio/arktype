import type { TraversalNode } from "../nodes/node.ts"
import { resolveFlat } from "../nodes/resolve.ts"
import { checkClass } from "../nodes/rules/class.ts"
import { checkDivisor } from "../nodes/rules/divisor.ts"
import { checkOptionalProps, checkRequiredProps } from "../nodes/rules/props.ts"
import type { BoundableData } from "../nodes/rules/range.ts"
import { checkRange } from "../nodes/rules/range.ts"
import { checkRegex } from "../nodes/rules/regex.ts"
import { precedenceMap } from "../nodes/rules/rules.ts"
import { checkSubdomain } from "../nodes/rules/subdomain.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Result, TypeOptions } from "../type.ts"
import { domainOf } from "../utils/domains.ts"
import type { Dict, evaluate, extend } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { Path } from "../utils/paths.ts"
import type { ProblemCode, ProblemMessageWriter } from "./problems.ts"
import { Problems, Stringifiable } from "./problems.ts"

export type TraversalEntry = Exclude<TraversalNode, string>[number]

export type TraversalKey = TraversalEntry[0]

export type TraversalState = {
    path: Path
    $: ScopeRoot
    config: TypeOptions
}

export type CheckState = evaluate<
    TraversalState & {
        problems: Problems
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
    $: ScopeRoot,
    config: TypeOptions
): Result<unknown> => {
    const state: CheckState = {
        path: "/",
        problems: new Problems(),
        $,
        config
    }
    const out = checkNode(data, node, state)
    return state.problems.length ? { problems: state.problems } : { data, out }
}

export const checkNode = (
    data: unknown,
    node: TraversalNode,
    state: CheckState
) => {
    if (typeof node === "string") {
        if (domainOf(data) !== node) {
            state.problems.addProblem(
                "domain",
                data,
                {
                    expected: [node]
                },
                state
            )
        }
        return
    }
    checkEntries(data, node, state)
}

export const checkEntries = (
    data: unknown,
    entries: readonly TraversalEntry[],
    state: CheckState
) => {
    let precedenceLevel = 0
    for (let i = 0; i < entries.length; i++) {
        const ruleName = entries[i][0]
        const ruleValidator = entries[i][1]
        if (
            state.problems.byPath[state.path] &&
            precedenceMap[ruleName] > precedenceLevel
        ) {
            break
        }
        ;(checkers[ruleName] as TraversalCheck<any>)(data, ruleValidator, state)
        precedenceLevel = precedenceMap[ruleName]
    }
}

const checkers = {
    regex: checkRegex,
    divisor: checkDivisor,
    domains: (data, domains, state) => {
        const entries = domains[domainOf(data)]
        if (entries) {
            checkEntries(data, entries, state)
        } else {
            state.problems.addProblem(
                "domain",
                data,
                {
                    expected: keysOf(domains)
                },
                state
            )
        }
    },
    domain: (data, domain, state) => {
        if (domainOf(data) !== domain) {
            state.problems.addProblem(
                "domain",
                data,
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
    branches: (data, branches, state) =>
        branches.some((condition) => {
            checkEntries(data, condition as any, state)
            // TODO: fix
            return state.problems.length === 0 ? true : false
        }),
    cases: () => {},
    // TODO: keep track of cyclic data
    alias: (data, name, state) =>
        checkNode(data, resolveFlat(name, state.$), state),
    morph: (data, morphNode, state) => checkNode(data, morphNode.input, state),
    class: checkClass,
    // TODO: add error message syntax.
    narrow: (data, validator) => validator(data),
    value: (data, value, state) => {
        if (data !== value) {
            state.problems.addProblem(
                "value",
                data,
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
    data: RuleInput<k>,
    value: Extract<TraversalEntry, [k, unknown]>[1],
    state: CheckState
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
