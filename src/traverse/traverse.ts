import { serializeCase } from "../nodes/discriminate.js"
import type {
    TraversalEntry,
    TraversalKey,
    TraversalNode,
    TraversalValue
} from "../nodes/node.js"
import { checkClass } from "../nodes/rules/class.js"
import { checkDivisor } from "../nodes/rules/divisor.js"
import type { TraversalProp } from "../nodes/rules/props.js"
import { checkBound } from "../nodes/rules/range.js"
import { checkRegex } from "../nodes/rules/regex.js"
import { precedenceMap } from "../nodes/rules/rules.js"
import type { QualifiedTypeName, Type, TypeConfig } from "../scopes/type.js"
import type { SizedData } from "../utils/data.js"
import type { Domain } from "../utils/domains.js"
import { domainOf, hasDomain } from "../utils/domains.js"
import type { extend, stringKeyOf } from "../utils/generics.js"
import { hasKey, objectKeysOf } from "../utils/generics.js"
import { getPath, Path } from "../utils/paths.js"
import type { SerializedPrimitive } from "../utils/serialize.js"
import { deserializePrimitive } from "../utils/serialize.js"
import type { ProblemCode, ProblemWriters } from "./problems.js"
import { defaultProblemWriters, Problems } from "./problems.js"

export class TraversalState<data = unknown> {
    path = new Path()
    problems = new Problems(this as any)
    configs: TypeConfig[]
    failFast = false

    #seen: { [name in QualifiedTypeName]?: object[] } = {}

    constructor(public data: data, public type: Type) {
        this.configs = type.meta.scope.config ? [type.meta.scope.config] : []
    }

    getConfigForProblemCode<code extends ProblemCode>(
        code: code
    ): ProblemWriters<code> {
        if (!this.configs.length) {
            return defaultProblemWriters[code]
        }
        for (let i = this.configs.length - 1; i >= 0; i--) {
            if (this.configs[i][code] || this.configs[i]["defaults"]) {
                return {
                    ...defaultProblemWriters[code],
                    ...this.configs[i]["defaults"],
                    ...this.configs[i][code]
                }
            }
        }
        return defaultProblemWriters[code]
    }

    traverseKey(key: stringKeyOf<this["data"]>, node: TraversalNode): boolean {
        const lastData = this.data
        this.data = this.data[key] as data
        this.path.push(key)
        const isValid = traverse(node, this)
        this.path.pop()
        lastData[key] = this.data as any
        this.data = lastData
        return isValid
    }

    traverseResolution(name: string): boolean {
        const resolution = this.type.meta.scope.resolve(name)
        const id = resolution.meta.id
        // this assignment helps with narrowing
        const data = this.data
        const isObject = hasDomain(data, "object")
        if (isObject) {
            if (hasKey(this.#seen, id)) {
                if (this.#seen[id].includes(data)) {
                    // if data has already been checked by this alias as part of
                    // a resolution higher up on the call stack, it must be valid
                    // or we wouldn't be here
                    return true
                }
                this.#seen[id].push(data)
            } else {
                this.#seen[id] = [data]
            }
        }
        const lastResolution = this.type
        this.type = resolution
        const isValid = traverse(resolution.flat, this)
        this.type = lastResolution
        if (isObject) {
            this.#seen[id]!.pop()
        }
        return isValid
    }

    traverseBranches(branches: TraversalEntry[][]): boolean {
        const lastFailFast = this.failFast
        this.failFast = true
        const lastProblems = this.problems
        const branchProblems = new Problems(this)
        this.problems = branchProblems
        const lastPath = this.path
        let hasValidBranch = false
        for (const branch of branches) {
            this.path = new Path()
            if (checkEntries(branch, this)) {
                hasValidBranch = true
                break
            }
        }
        this.path = lastPath
        this.problems = lastProblems
        this.failFast = lastFailFast
        return (
            hasValidBranch || this.problems.create("branches", branchProblems)
        )
    }
}

export const traverse = (node: TraversalNode, state: TraversalState): boolean =>
    typeof node === "string"
        ? domainOf(state.data) === node || state.problems.create("domain", node)
        : checkEntries(node, state)

export const checkEntries = (
    entries: TraversalEntry[],
    state: TraversalState
): boolean => {
    let isValid = true
    for (let i = 0; i < entries.length; i++) {
        const [k, v] = entries[i]
        const entryAllowsData = (entryCheckers[k] as EntryChecker<any>)(
            v,
            state
        )
        isValid &&= entryAllowsData
        if (!isValid) {
            if (state.failFast) {
                return false
            }
            if (
                i < entries.length - 1 &&
                precedenceMap[k] < precedenceMap[entries[i + 1][0]]
            ) {
                // if we've encountered a problem, there is at least one entry
                // remaining, and the next entry is of a higher precedence level
                // than the current entry, return immediately
                return false
            }
        }
    }
    return isValid
}

export const checkRequiredProp = (
    prop: TraversalProp,
    state: TraversalState<TraversableData>
) => {
    if (prop[0] in state.data) {
        return state.traverseKey(prop[0], prop[1])
    }
    return state.problems.create("missing", undefined, {
        path: state.path.concat(prop[0]),
        data: undefined
    })
}

const entryCheckers = {
    regex: checkRegex,
    divisor: checkDivisor,
    domains: (domains, state) => {
        const entries = domains[domainOf(state.data)]
        return entries
            ? checkEntries(entries, state)
            : state.problems.create("domainBranches", objectKeysOf(domains))
    },
    domain: (domain, state) =>
        domainOf(state.data) === domain ||
        state.problems.create("domain", domain),
    bound: checkBound,
    optionalProp: (prop, state) => {
        if (prop[0] in state.data) {
            return state.traverseKey(prop[0], prop[1])
        }
        return true
    },
    // these checks work the same way, the keys are only distinct so that
    // prerequisite props can have a higher precedence
    requiredProp: checkRequiredProp,
    prerequisiteProp: checkRequiredProp,
    indexProp: (node, state) => {
        if (!Array.isArray(state.data)) {
            return state.problems.create("class", "Array")
        }
        let isValid = true
        for (let i = 0; i < state.data.length; i++) {
            isValid &&= state.traverseKey(`${i}`, node)
            if (!isValid && state.failFast) {
                return false
            }
        }
        return isValid
    },
    branches: (branches, state) => state.traverseBranches(branches),
    switch: (rule, state) => {
        const dataAtPath = getPath(state.data, rule.path)
        const caseKey = serializeCase(rule.kind, dataAtPath)
        if (hasKey(rule.cases, caseKey)) {
            return checkEntries(rule.cases[caseKey], state)
        }
        const caseKeys = objectKeysOf(rule.cases)
        const missingCasePath = state.path.concat(rule.path)
        return rule.kind === "value"
            ? state.problems.create(
                  "valueBranches",
                  caseKeys.map((k) =>
                      deserializePrimitive(k as SerializedPrimitive)
                  ),
                  { path: missingCasePath, data: dataAtPath }
              )
            : state.problems.create("domainBranches", caseKeys as Domain[], {
                  path: missingCasePath,
                  data: dataAtPath
              })
    },
    alias: (name, state) => state.traverseResolution(name),
    class: checkClass,
    narrow: (narrow, state) => narrow(state.data, state.problems),
    config: ({ config, node }, state) => {
        state.configs.push(config)
        const result = traverse(node, state)
        state.configs.pop()
        return result
    },
    value: (value, state) =>
        state.data === value || state.problems.create("value", value),
    morph: (morph, state) => {
        const lastProblemCount = state.problems.count
        const out = morph(state.data, state.problems)
        if (state.problems.count > lastProblemCount) {
            return false
        }
        state.data = out
        return true
    }
} satisfies {
    [k in TraversalKey]: EntryChecker<k>
}

export type ValidationTraversalKey = Exclude<TraversalKey, "morph">

export type EntryChecker<k extends TraversalKey> = (
    constraint: TraversalValue<k>,
    state: TraversalState<RuleData<k>>
) => boolean

export type TraversableData = Record<string | number, unknown>

export type ConstrainedRuleTraversalData = extend<
    { [k in TraversalKey]?: unknown },
    {
        regex: string
        divisor: number
        bound: SizedData
        prerequisiteProp: TraversableData
        optionalProp: TraversableData
        requiredProp: TraversableData
        indexProp: TraversableData
    }
>

export type RuleData<k extends TraversalKey> =
    k extends keyof ConstrainedRuleTraversalData
        ? ConstrainedRuleTraversalData[k]
        : unknown
