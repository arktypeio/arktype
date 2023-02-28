import { serializeCase } from "../nodes/discriminate.ts"
import type {
    ConfigEntry,
    TraversalEntry,
    TraversalKey,
    TraversalNode,
    TraversalValue
} from "../nodes/node.ts"
import { checkClass } from "../nodes/rules/class.ts"
import { checkDivisor } from "../nodes/rules/divisor.ts"
import type {
    PropsRecordEntry,
    PropsRecordKey,
    TraversalProp
} from "../nodes/rules/props.ts"
import { checkBound } from "../nodes/rules/range.ts"
import { checkRegex } from "../nodes/rules/regex.ts"
import { precedenceMap } from "../nodes/rules/rules.ts"
import type { Scope } from "../scopes/scope.ts"
import type { QualifiedTypeName, Type, TypeConfig } from "../scopes/type.ts"
import { isCheckResult } from "../scopes/type.ts"
import type { SizedData } from "../utils/data.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf, hasDomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { extend, stringKeyOf } from "../utils/generics.ts"
import { hasKey, objectKeysOf } from "../utils/generics.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { getPath, Path } from "../utils/paths.ts"
import type { ProblemCode, ProblemOptions, ProblemWriters } from "./problems.ts"
import {
    domainsToDescriptions,
    objectKindsToDescriptions,
    Problem,
    Problems
} from "./problems.ts"

const initializeTraversalConfig = (): TraversalConfig => ({
    mustBe: [],
    writeReason: [],
    addContext: [],
    keys: []
})

type ProblemWriterKey = keyof ProblemOptions

const problemWriterKeys: readonly ProblemWriterKey[] = [
    "mustBe",
    "writeReason",
    "addContext"
]

export class TraversalState<data = unknown> {
    path = new Path()
    problems = new Problems(this as any)

    failFast = false
    traversalConfig = initializeTraversalConfig()
    readonly rootScope: Scope

    #seen: { [name in QualifiedTypeName]?: object[] } = {}

    constructor(public data: data, public type: Type) {
        this.rootScope = type.scope
    }

    getProblemConfig<code extends ProblemCode>(
        code: code
    ): ProblemWriters<code> {
        const result = {} as ProblemWriters<code>
        for (const k of problemWriterKeys) {
            result[k] =
                this.traversalConfig[k][0] ??
                (this.rootScope.config.codes[code][k] as any)
        }
        return result
    }

    getConfigKey<k extends keyof TypeConfig>(k: k) {
        return this.traversalConfig[k][0] as TypeConfig[k] | undefined
    }

    traverseConfig(configEntries: ConfigEntry[], node: TraversalNode) {
        for (const entry of configEntries) {
            this.traversalConfig[entry[0]].unshift(entry[1] as any)
        }
        const isValid = traverse(node, this)
        for (const entry of configEntries) {
            this.traversalConfig[entry[0]].shift()
        }
        return isValid
    }

    traverseKey(key: stringKeyOf<this["data"]>, node: TraversalNode): boolean {
        const lastData = this.data
        this.data = this.data[key] as data
        this.path.push(key)
        const isValid = traverse(node, this)
        this.path.pop()
        if (lastData[key] !== this.data) {
            lastData[key] = this.data as any
        }
        this.data = lastData
        return isValid
    }

    traverseResolution(name: string): boolean {
        const resolution = this.type.scope.resolve(name)
        const id = resolution.qualifiedName
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
        const lastType = this.type
        this.type = resolution
        const isValid = traverse(resolution.flat, this)
        this.type = lastType
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

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
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

const createPropChecker =
    (kind: PropsRecordKey) =>
    (props: PropsRecordEntry[1], state: TraversalState<TraversableData>) => {
        let isValid = true
        const unseenRequired = { ...props.required }
        for (const k in state.data) {
            if (props.required[k]) {
                isValid &&= state.traverseKey(k, props.required[k])
                delete unseenRequired[k]
            } else if (props.optional[k]) {
                isValid &&= state.traverseKey(k, props.optional[k])
            } else if (kind === "distilledProps") {
                // TODO https://github.com/arktypeio/arktype/issues/664
                delete state.data[k]
            } else {
                state.problems.add("extraneous", state.data[k], {
                    path: state.path.concat(k)
                })
                isValid = false
            }
            if (!isValid && state.failFast) {
                return false
            }
        }
        return isValid
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
                : /* c8 ignore start*/
                  throwInternalError(
                      `Unexpectedly encountered rule kind '${rule.kind}' during traversal`
                  )
        /* c8 ignore stop*/
        state.problems.add("cases", caseDescriptions, {
            path: missingCasePath,
            data: dataAtPath
        })
        return false
    },
    alias: (name, state) => state.traverseResolution(name),
    class: checkClass,
    narrow: (narrow, state) => {
        const lastProblemsCount = state.problems.count
        const result = narrow(state.data, state.problems)
        if (!result && state.problems.count === lastProblemsCount) {
            state.problems.mustBe(
                narrow.name ? `valid according to ${narrow.name}` : "valid"
            )
        }
        return result
    },
    config: ({ config, node }, state) => state.traverseConfig(config, node),
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
        if (isCheckResult(out)) {
            if (out.problems) {
                for (const problem of out.problems) {
                    state.problems.addProblem(problem)
                }
                return false
            }
            state.data = out.data
            return true
        }
        state.data = out
        return true
    },
    distilledProps: createPropChecker("distilledProps"),
    strictProps: createPropChecker("strictProps")
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
        distilledProps: TraversableData
        strictProps: TraversableData
    }
>

export type RuleData<k extends TraversalKey> =
    k extends keyof ConstrainedRuleTraversalData
        ? ConstrainedRuleTraversalData[k]
        : unknown
