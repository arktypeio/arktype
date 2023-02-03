import type { Type } from "../main.ts"
import { serializeCase } from "../nodes/discriminate.ts"
import type {
    TraversalEntry,
    TraversalKey,
    TraversalNode
} from "../nodes/node.ts"
import { checkClass } from "../nodes/rules/class.ts"
import { checkDivisor } from "../nodes/rules/divisor.ts"
import type { TraversalPropEntry } from "../nodes/rules/props.ts"
import { checkRange } from "../nodes/rules/range.ts"
import { checkRegex } from "../nodes/rules/regex.ts"
import { precedenceMap } from "../nodes/rules/rules.ts"
import type { SizedData } from "../utils/domains.ts"
import { domainOf, hasDomain, subdomainOf } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { Dict, evaluate, extend, List } from "../utils/generics.ts"
import { hasKey, keysOf } from "../utils/generics.ts"
import { getPath, Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type {
    ProblemCode,
    ProblemContext,
    ProblemDescriptionWriter,
    ProblemInput
} from "./problems.ts"
import { DataWrapper } from "./problems.ts"

export class TraversalState {
    path = new Path()
    problemsByPath: { [path in string]?: ProblemContext } = {}

    // TODO: name by scope (scope registry?) Weakmap perf?
    #seen: { [name in string]?: object[] } = {}

    constructor(private type: Type) {}

    get config() {
        return this.type.config
    }

    problem<code extends ProblemCode>(code: code, input: ProblemInput<code>) {
        const pathKey = `${this.path}`
        const existing = this.problemsByPath[pathKey]
        if (existing) {
            if (existing.code === "multi") {
                existing.problems.push(problem)
            } else {
                this.problemsByPath[pathKey] = {
                    problems: [existing]
                }
            }
        } else {
            this.problemsByPath[pathKey] = Object.assign(
                input,
                "data" in input
                    ? {
                          code,
                          data: new DataWrapper(input.data)
                      }
                    : { code }
            )
        }
        // TODO: Should we include multi-part in lists?
        this.push(problem)
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
        traverse(data, this.type.flat, this)
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
        this.problem("union", { data })
    }
}

export type ProblemsOptions = evaluate<
    {
        [code in ProblemCode]?:
            | ProblemDescriptionWriter<code>
            | BaseProblemConfig<code>
    } & BaseProblemConfig
>

// TODO: Add problems config compiler
export type ProblemsConfig = evaluate<
    {
        [code in ProblemCode]?: Exclude<ProblemsOptions[code], Function>
    } & BaseProblemConfig
>

export type BaseProblemConfig<code extends ProblemCode = ProblemCode> = {
    message?: ProblemDescriptionWriter<code>
    omitActual?: boolean
}

export const traverse = (
    data: unknown,
    node: TraversalNode,
    state: TraversalState
) => {
    if (typeof node === "string") {
        if (domainOf(data) !== node) {
            return state.problem("domain", { domains: [node], data })
        }
        return
    }
    return checkEntries(data, node, state)
}

export const checkEntries = (
    data: unknown,
    entries: List<TraversalEntry>,
    state: TraversalState
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

const createPropChecker = <propKind extends "requiredProps" | "optionalProps">(
    propKind: propKind
) =>
    ((data, props, state) => {
        const rootPath = state.path
        for (const [propKey, propNode] of props as TraversalPropEntry[]) {
            state.path.push(propKey)
            if (!hasKey(data, propKey)) {
                if (propKind !== "optionalProps") {
                    // TODO: resolve domains
                    state.problem("missing", { domains: [] })
                }
            } else {
                traverse(data[propKey], propNode, state)
            }
            state.path.pop()
        }
        state.path = rootPath
    }) as TraversalCheck<propKind>

const checkRequiredProps = createPropChecker("requiredProps")
const checkOptionalProps = createPropChecker("optionalProps")

export const checkSubdomain: TraversalCheck<"subdomain"> = (
    data,
    rule,
    state
) => {
    const dataSubdomain = subdomainOf(data)
    if (typeof rule === "string") {
        if (dataSubdomain !== rule) {
            return state.problem("domain", { domains: [rule], data })
        }
        return
    }
    if (dataSubdomain !== rule[0]) {
        return state.problem("domain", { domains: [rule[0]], data })
    }
    if (dataSubdomain === "Array" && typeof rule[2] === "number") {
        const actual = (data as List).length
        const expected = rule[2]
        if (expected !== actual) {
            return state.problem("tupleLength", {
                length: expected,
                data: data as List
            })
        }
    }
    if (dataSubdomain === "Array" || dataSubdomain === "Set") {
        let i = 0
        for (const item of data as List | Set<unknown>) {
            state.path.push(`${i}`)
            traverse(item, rule[1], state)
            state.path.pop()
            i++
        }
    } else {
        return throwInternalError(
            `Unexpected subdomain entry ${stringify(rule)}`
        )
    }
    return true
}

const checkers = {
    regex: checkRegex,
    divisor: checkDivisor,
    domains: (data, domains, state) => {
        const entries = domains[domainOf(data)]
        if (entries) {
            checkEntries(data, entries, state)
        } else {
            state.problem("domain", { domains: keysOf(domains), data })
        }
    },
    domain: (data, domain, state) => {
        if (domainOf(data) !== domain) {
            state.problem("domain", { domains: [domain], data })
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
        state.problem("union", { data })
        state.path = lastPath
    },
    alias: (data, name, state) => state.traverseResolution(data, name),
    class: checkClass,
    // TODO: add error message syntax.
    narrow: (data, narrow) => narrow(data),
    value: (data, value, state) => {
        if (data !== value) {
            state.problem("value", { value, data })
        }
    }
} satisfies {
    [k in ValidationKey]: TraversalCheck<k>
} as {
    // after validating that each checker has the appropriate type, cast to a
    // more permissive type that avoids inferring input as never
    [k in ValidationKey]: TraversalCheck<any>
}

type ValidationKey = Exclude<TraversalKey, "morph">

export type TraversalCheck<k extends TraversalKey> = (
    data: RuleData<k>,
    rule: Extract<TraversalEntry, [k, unknown]>[1],
    state: TraversalState
) => void

export type ConstrainedRuleData = extend<
    { [k in TraversalKey]?: unknown },
    {
        regex: string
        divisor: number
        range: SizedData
        requiredProps: Dict
        optionalProps: Dict
        class: object
    }
>

export type RuleData<k extends TraversalKey> =
    k extends keyof ConstrainedRuleData ? ConstrainedRuleData[k] : unknown
