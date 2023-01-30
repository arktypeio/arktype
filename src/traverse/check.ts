import type { Result, Type } from "../main.ts"
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
import { domainOf, hasSubdomain } from "../utils/domains.ts"
import type { Dict, extend, List } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import type {
    Problem,
    ProblemCode,
    ProblemInputs,
    ProblemMessageWriter
} from "./problems.ts"
import { defaultMessagesByCode, Problems, Stringifiable } from "./problems.ts"

export class TraversalState {
    path: Path

    constructor(public type: Type) {
        this.path = new Path()
    }
}

export class DataTraversalState extends TraversalState {
    problems: Problems

    constructor(type: Type) {
        super(type)
        this.problems = new Problems()
    }

    addProblem<code extends ProblemCode>(ctx: ProblemInputs[code]) {
        ctx.data = new Stringifiable(ctx.data)
        const problemConfig = this.type.config.problems?.[ctx.code]
        const customMessageWriter =
            typeof problemConfig === "function"
                ? (problemConfig as ProblemMessageWriter<code>)
                : problemConfig?.message
        const problem: Problem = {
            path: `${this.path}`,
            reason:
                customMessageWriter?.(ctx as never) ??
                defaultMessagesByCode[ctx.code](ctx as never)
        }
        this.problems.push(problem)
        // TODO: migrate multi-part errors
        this.problems.byPath[problem.path] = problem
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

export const traverse = (data: unknown, type: Type): Result<unknown> => {
    const state = new DataTraversalState(type)
    const out = traverseNode(data, type.flat, state)
    return state.problems.length ? { problems: state.problems } : { data, out }
}

export const traverseNode = (
    data: unknown,
    flat: TraversalNode,
    state: DataTraversalState
) => {
    if (typeof flat === "string") {
        if (domainOf(data) !== flat) {
            state.addProblem({
                code: "domain",
                data,
                expected: [flat]
            })
        }
        return
    }
    return checkEntries(data, flat, state)
}

export const checkEntries = (
    data: unknown,
    entries: List<TraversalEntry>,
    state: DataTraversalState
) => {
    let precedenceLevel = 0
    const pathKey = `${state.path}`
    for (let i = 0; i < entries.length; i++) {
        const k = entries[i][0]
        const v = entries[i][1]

        if (
            // Return problems? Nested props wouldn't work
            state.problems.byPath[pathKey] &&
            precedenceMap[k] > precedenceLevel
        ) {
            break
        }
        if (k === "morph") {
            if (hasSubdomain(v, "Array")) {
                let out = data
                for (const morph of v as List<Morph>) {
                    out = morph(out)
                }
                return out
            }
            return (v as Morph)(data)
        }
        ;(checkers[k] as TraversalCheck<any>)(data, v, state)
        precedenceLevel = precedenceMap[k]
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
            state.addProblem({
                code: "domain",
                data,
                expected: keysOf(domains)
            })
        }
    },
    domain: (data, domain, state) => {
        if (domainOf(data) !== domain) {
            state.addProblem({
                code: "domain",
                data,
                expected: [domain]
            })
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
        traverseNode(data, state.type.scope.resolve(name).flat, state),
    class: checkClass,
    // TODO: add error message syntax.
    narrow: (data, narrow) => narrow(data),
    value: (data, value, state) => {
        if (data !== value) {
            state.addProblem({
                code: "value",
                data,
                expected: new Stringifiable(value)
            })
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
