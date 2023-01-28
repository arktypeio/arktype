import type {
    TraversalEntry,
    TraversalKey,
    TraversalNode
} from "../nodes/node.ts"
import { checkClass } from "../nodes/rules/class.ts"
import { checkDivisor } from "../nodes/rules/divisor.ts"
import { checkOptionalProps, checkRequiredProps } from "../nodes/rules/props.ts"
import type { BoundableData } from "../nodes/rules/range.ts"
import { checkRange } from "../nodes/rules/range.ts"
import { checkRegex } from "../nodes/rules/regex.ts"
import { precedenceMap } from "../nodes/rules/rules.ts"
import { checkSubdomain } from "../nodes/rules/subdomain.ts"
import type { Morph } from "../parse/tuple/morph.ts"
import type { Scope } from "../scope.ts"
import type { Result, TypeOptions } from "../type.ts"
import { domainOf } from "../utils/domains.ts"
import type { Dict, extend, List } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import type { ProblemCode, ProblemMessageWriter } from "./problems.ts"
import { Problems, Stringifiable } from "./problems.ts"

export class TraversalState {
    path: Path

    constructor(public $: Scope, public config: TypeOptions) {
        this.path = new Path()
    }
}

export class DataTraversalState extends TraversalState {
    problems: Problems

    constructor($: Scope, config: TypeOptions) {
        super($, config)
        this.problems = new Problems()
    }
}

export type ProblemsOptions = {
    [code in ProblemCode]?: BaseProblemOptions<code>
}

export type BaseProblemOptions<code extends ProblemCode> =
    | ProblemMessageWriter<code>
    | {
          message?: ProblemMessageWriter<code>
      }

export const traverse = (
    data: unknown,
    node: TraversalNode,
    $: Scope,
    config: TypeOptions
): Result<unknown> => {
    const state = new DataTraversalState($, config)
    const out = traverseNode(data, node, state)
    return state.problems.length ? { problems: state.problems } : { data, out }
}

export const traverseNode = (
    data: unknown,
    node: TraversalNode,
    state: DataTraversalState
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
    return checkEntries(data, node, state)
}

export const checkEntries = (
    data: unknown,
    entries: List<TraversalEntry>,
    state: DataTraversalState
) => {
    let precedenceLevel = 0
    const pathKey = `${state.path}`
    for (let i = 0; i < entries.length; i++) {
        const ruleName = entries[i][0]
        const ruleValidator = entries[i][1]
        if (
            state.problems.byPath[pathKey] &&
            precedenceMap[ruleName] > precedenceLevel
        ) {
            break
        }

        // TODO: improve
        if (ruleName === "morph") {
            data = (ruleValidator as Morph)(data)
        } else {
            ;(checkers[ruleName] as TraversalCheck<any>)(
                data,
                ruleValidator,
                state
            )
        }
        precedenceLevel = precedenceMap[ruleName]
    }
    return data
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
    switch: () => {},
    // TODO: keep track of cyclic data
    alias: (data, name, state) =>
        traverseNode(data, state.$.resolve(name).flat, state),
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
    [k in Exclude<TraversalKey, "morph">]: TraversalCheck<k>
}

export type TraversalCheck<k extends TraversalKey> = (
    data: RuleInput<k>,
    value: Extract<TraversalEntry, [k, unknown]>[1],
    state: DataTraversalState
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
