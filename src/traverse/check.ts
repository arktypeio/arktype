import type { Type } from "../main.ts"
import { serializeCase } from "../nodes/discriminate.ts"
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
import { domainOf, hasDomain } from "../utils/domains.ts"
import type { Dict, extend, List } from "../utils/generics.ts"
import { hasKey, keysOf } from "../utils/generics.ts"
import { getPath, Path } from "../utils/paths.ts"
import type {
    Problem,
    ProblemCode,
    ProblemContexts,
    ProblemInputs,
    ProblemMessageWriter
} from "./problems.ts"
import { defaultMessagesByCode, Problems, Stringifiable } from "./problems.ts"

export class TraversalState {
    path: Path

    constructor(protected type: Type) {
        this.path = new Path()
    }
}

export class DataTraversalState extends TraversalState {
    problems: Problems
    // TODO: name by scope (scope registry?)
    #seen: { [name in string]?: object[] } = {}

    constructor(type: Type) {
        super(type)
        this.problems = new Problems()
    }

    traverseResolution(data: unknown, name: string) {
        const lastType = this.type
        if (hasDomain(data, "object")) {
            if (hasKey(this.#seen, name)) {
                if (
                    this.#seen[name].some((checkedData) => data === checkedData)
                ) {
                    // If data has already been checked by this alias during this
                    // traversal, it must be valid or we wouldn't be here, so we can
                    // stop traversing.
                    return
                }
                this.#seen[name].push(data)
            } else {
                this.#seen[name] = [data]
            }
        }
        this.type = this.type.scope.resolve(name)
        traverseNode(data, this.type.flat, this)
        this.type = lastType
    }

    // TODO: add fast fail mode, use for unions
    traverseBranches(data: unknown, branches: TraversalEntry[][]) {
        const baseProblems = this.problems
        const subproblems: Problems[] = []
        for (const branch of branches) {
            this.problems = new Problems()
            checkEntries(data, branch, this)
            if (!this.problems.length) {
                this.problems = baseProblems
                return
            }
            subproblems.push(this.problems)
        }
        this.problems = baseProblems
        this.addProblem({ code: "union", data, subproblems })
    }

    // TODO: Don't calculate problem strings until necessary
    addProblem<code extends ProblemCode>(input: ProblemInputs[code]) {
        const data = new Stringifiable(input.data)
        // copy path so future mutations don't affect it
        const path = Path.from(this.path)
        const ctx = Object.assign(input, {
            data,
            path
        }) as unknown as ProblemContexts[ProblemCode]
        const pathKey = `${this.path}`
        const existing = this.problems.byPath[pathKey]
        if (existing) {
            existing.parts ??= [existing.reason]
            existing.parts.push(this.#writeMessage(ctx))
            existing.reason = this.#writeMessage({
                code: "multi",
                data,
                path,
                parts: existing.parts
            })
        } else {
            const problem: Problem = {
                path,
                reason: this.#writeMessage(ctx)
            }
            this.problems.byPath[pathKey] = problem
            this.problems.push(problem)
        }
    }

    #writeMessage(ctx: ProblemContexts[ProblemCode]) {
        const problemConfig = this.type.config.problems?.[ctx.code]
        const writer = (
            typeof problemConfig === "function"
                ? problemConfig
                : problemConfig?.message ?? defaultMessagesByCode[ctx.code]
        ) as ProblemMessageWriter
        return writer(ctx)
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
    let problemsPrecedence = Number.POSITIVE_INFINITY
    const initialProblemsCount = state.problems.length
    for (const [k, v] of entries) {
        if (precedenceMap[k] > problemsPrecedence) {
            return
        }
        if (k === "morph") {
            if (typeof v === "function") {
                return v(data)
            }
            let out = data
            for (const morph of v) {
                out = morph(out)
            }
            return out
        } else {
            checkers[k](data, v, state)
            if (state.problems.length > initialProblemsCount) {
                problemsPrecedence = precedenceMap[k]
            }
        }
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
    branches: (data, branches, state) => state.traverseBranches(data, branches),
    switch: (data, rule, state) => {
        const dataAtPath = getPath(data, rule.path)
        const caseKey = serializeCase(rule.kind, dataAtPath)
        if (hasKey(rule.cases, caseKey)) {
            return checkEntries(data, rule.cases[caseKey], state)
        }
        const lastPath = state.path
        state.path = rule.path
        state.addProblem({
            code: "union",
            data: dataAtPath,
            subproblems: [new Problems()]
        })
        state.path = lastPath
    },
    alias: (data, name, state) => state.traverseResolution(data, name),
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
    [k in ValidationKey]: TraversalCheck<k>
} as {
    [k in ValidationKey]: TraversalCheck<any>
}

type ValidationKey = Exclude<TraversalKey, "morph">

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
