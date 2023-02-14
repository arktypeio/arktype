import { serializeCase } from "../nodes/discriminate.ts"
import type {
    TraversalEntry,
    TraversalKey,
    TraversalNode,
    TraversalValue
} from "../nodes/node.ts"
import { checkClass } from "../nodes/rules/class.ts"
import { checkDivisor } from "../nodes/rules/divisor.ts"
import type { TraversalProp } from "../nodes/rules/props.ts"
import { checkBound } from "../nodes/rules/range.ts"
import { checkRegex } from "../nodes/rules/regex.ts"
import { precedenceMap } from "../nodes/rules/rules.ts"
import type { ArkTypeConfig, QualifiedTypeName, Type } from "../scopes/type.ts"
import type { SizedData } from "../utils/data.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf, hasDomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { extend, stringKeyOf } from "../utils/generics.ts"
import { hasKey, objectKeysOf } from "../utils/generics.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { getPath, Path } from "../utils/paths.ts"
import type { ProblemCode, ProblemWriters } from "./problems.ts"
import {
    defaultProblemWriters,
    domainsToDescriptions,
    objectKindsToDescriptions,
    Problem,
    Problems
} from "./problems.ts"

export class TraversalState<data = unknown> {
    path = new Path()
    problems = new Problems(this as any)
    configs: ArkTypeConfig[]
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
            const seenByCurrentType = this.#seen[id]
            if (seenByCurrentType) {
                if (seenByCurrentType.includes(data)) {
                    // if data has already been checked by this alias as part of
                    // a resolution higher up on the call stack, it must be valid
                    // or we wouldn't be here
                    return true
                }
                seenByCurrentType.push(data)
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
        return hasValidBranch || !this.problems.add("branches", branchProblems)
    }
}

export const traverse = (node: TraversalNode, state: TraversalState): boolean =>
    typeof node === "string"
        ? domainOf(state.data) === node || !state.problems.add("domain", node)
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
    state.problems.add("missing", undefined, {
        path: state.path.concat(prop[0]),
        data: undefined
    })
    return false
}

const entryCheckers = {
    regex: checkRegex,
    divisor: checkDivisor,
    domains: (domains, state) => {
        const entries = domains[domainOf(state.data)]
        return entries
            ? checkEntries(entries, state)
            : !state.problems.add(
                  "cases",
                  domainsToDescriptions(objectKeysOf(domains))
              )
    },
    domain: (domain, state) =>
        domainOf(state.data) === domain ||
        !state.problems.add("domain", domain),
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
            state.problems.add("class", "Array")
            return false
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
        const caseDescriptions =
            rule.kind === "value"
                ? caseKeys
                : rule.kind === "domain"
                ? domainsToDescriptions(caseKeys as Domain[])
                : rule.kind === "class"
                ? objectKindsToDescriptions(caseKeys as DefaultObjectKind[])
                : throwInternalError(
                      `Unexpectedly encountered rule kind '${rule.kind}' during traversal`
                  )
        state.problems.add("cases", caseDescriptions, {
            path: missingCasePath,
            data: dataAtPath
        })
        return false
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
        state.data === value || !state.problems.add("value", value),
    morph: (morph, state) => {
        const out = morph(state.data, state.problems)
        if (state.problems.length) {
            return false
        }
        if (out instanceof Problem) {
            // if a problem was returned from the morph but not added, add it
            state.problems.addProblem(out)
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
