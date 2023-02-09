import { serializeCase } from "../nodes/discriminate.js"
import type {
    TraversalEntry,
    TraversalKey,
    TraversalNode,
    TraversalValue
} from "../nodes/node.js"
import { checkClass } from "../nodes/rules/class.js"
import { checkDivisor } from "../nodes/rules/divisor.js"
import type { TraversalPropEntry } from "../nodes/rules/props.js"
import { checkBound } from "../nodes/rules/range.js"
import { checkRegex } from "../nodes/rules/regex.js"
import { precedenceMap } from "../nodes/rules/rules.js"
import type { QualifiedTypeName, Type, TypeConfig } from "../scopes/type.js"
import type { Domain } from "../utils/domains.js"
import { domainOf, hasDomain } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { Dict, extend, List } from "../utils/generics.js"
import { hasKey, keysOf } from "../utils/generics.js"
import { objectKindOf } from "../utils/objectKinds.js"
import { getPath, Path } from "../utils/paths.js"
import type { SerializedPrimitive } from "../utils/serialize.js"
import { deserializePrimitive, stringify } from "../utils/serialize.js"
import type { SizedData } from "../utils/size.js"
import type { ProblemCode, ProblemWriters } from "./problems.js"
import { defaultProblemWriters, Problem, Problems } from "./problems.js"

export class TraversalState {
    path = new Path()
    problems = new Problems(this)
    configs: TypeConfig[]
    failFast = false

    #seen: { [name in QualifiedTypeName]?: object[] } = {}

    constructor(public type: Type) {
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

    traverseResolution(data: unknown, name: string): TraversalReturn {
        const resolution = this.type.meta.scope.resolve(name)
        const id = resolution.meta.id
        const isObject = hasDomain(data, "object")
        if (isObject) {
            if (hasKey(this.#seen, id)) {
                if (this.#seen[id].includes(data)) {
                    // if data has already been checked by this alias as part of
                    // a resolution higher up on the call stack, it must be valid
                    // or we wouldn't be here
                    return data
                }
                this.#seen[id].push(data)
            } else {
                this.#seen[id] = [data]
            }
        }
        const lastResolution = this.type
        this.type = resolution
        const result = traverse(data, resolution.flat, this)
        this.type = lastResolution
        if (isObject) {
            this.#seen[id]!.pop()
        }
        return result
    }

    traverseBranches(data: unknown, branches: TraversalEntry[][]) {
        if (!branches.length) {
            // we shouldn't normally have an empty set of branches after
            // compilation, but in case we do, return a problem immediately (an
            // empty set of branches is equivalent to never).
            return this.problems.add("branches", data, [])
        }
        const lastFailFast = this.failFast
        this.failFast = true
        const lastProblems = this.problems
        const branchProblems = new Problems(this)
        this.problems = branchProblems
        const lastPath = this.path
        let result: TraversalReturn
        for (const branch of branches) {
            this.path = new Path()
            result = checkEntries(data, branch, this)
            if (!(result instanceof Problem)) {
                break
            }
        }
        this.path = lastPath
        this.problems = lastProblems
        this.failFast = lastFailFast
        // we've already checked that branches is non-empty, so result must have been assigned here
        return result! instanceof Problem
            ? this.problems.add("branches", data, branchProblems)
            : result!
    }
}

export const traverse = (
    data: unknown,
    node: TraversalNode,
    state: TraversalState
): TraversalReturn => {
    if (typeof node === "string") {
        if (domainOf(data) !== node) {
            return state.problems.add("domain", data, node)
        }
        return data!
    }
    return checkEntries(data, node, state)
}

export const checkEntries = (
    data: unknown,
    entries: TraversalEntry[],
    state: TraversalState
): TraversalReturn => {
    // lastOut should never be set to a Problem so that we can continue
    // traversing within the same precedence level even if there is a problem.
    let lastOut: TraversalReturn = data!
    let firstProblem: Problem | undefined
    for (let i = 0; i < entries.length; i++) {
        const result = (entryTraversals[entries[i][0]] as EntryTraversal<any>)(
            lastOut,
            entries[i][1],
            state
        )
        if (!firstProblem) {
            if (result instanceof Problem) {
                if (state.failFast) {
                    return result
                }
                firstProblem = result
            } else {
                lastOut = result!
            }
        } else if (
            i < entries.length - 1 &&
            precedenceMap[entries[i][0]] < precedenceMap[entries[i + 1][0]]
        ) {
            // if we've encountered a problem, there is at least one entry
            // remaining, and the next entry is of a higher precedence level
            // than the current entry, return immediately
            return firstProblem
        }
    }
    return firstProblem ?? lastOut
}

const createPropChecker = <propKind extends "requiredProps" | "optionalProps">(
    propKind: propKind
) =>
    ((data, props, state) => {
        let firstProblem: Problem | undefined
        const outProps: Record<string, unknown> = {}
        for (const [propKey, propNode] of props as TraversalPropEntry[]) {
            let result: TraversalReturn
            if (propKey in data) {
                state.path.push(propKey)
                result = traverse(data[propKey], propNode, state)
                state.path.pop()
            } else if (propKind === "optionalProps") {
                continue
            } else {
                result = state.problems.add("missing", undefined, undefined, {
                    path: state.path.concat(propKey)
                })
            }
            if (!firstProblem) {
                if (result instanceof Problem) {
                    if (state.failFast) {
                        return result
                    }
                    firstProblem = result
                } else {
                    outProps[propKey] = result
                }
            }
        }
        return firstProblem ?? outProps
    }) satisfies EntryTraversal<any> as EntryTraversal<propKind>

const checkRequiredProps = createPropChecker("requiredProps")
const checkOptionalProps = createPropChecker("optionalProps")

export const checkObjectKind: EntryTraversal<"objectKind"> = (
    data,
    rule,
    state
) => {
    const dataObjectKind = objectKindOf(data)
    if (typeof rule === "string") {
        if (dataObjectKind !== rule) {
            return state.problems.add("objectKind", data, rule)
        }
        return data
    }
    if (dataObjectKind !== rule[0]) {
        return state.problems.add("objectKind", data, rule[0])
    }
    if (dataObjectKind === "Array") {
        const dataList = data as List
        let firstProblem: Problem | undefined
        const outList: TraversalReturn[] = []
        for (let i = 0; i < dataList.length; i++) {
            state.path.push(`${i}`)
            const itemResult = traverse(dataList[i], rule[1], state)
            state.path.pop()
            if (!firstProblem) {
                if (itemResult instanceof Problem) {
                    if (state.failFast) {
                        return itemResult
                    }
                    firstProblem = itemResult
                } else {
                    outList.push(itemResult)
                }
            }
            i++
        }
        return firstProblem ?? outList
    }
    return throwInternalError(`Unexpected objectKind entry ${stringify(rule)}`)
}

const entryTraversals = {
    regex: checkRegex,
    divisor: checkDivisor,
    domains: (data, domains, state) => {
        const entries = domains[domainOf(data)]
        return entries
            ? checkEntries(data, entries, state)
            : state.problems.add("domainBranches", data, keysOf(domains))
    },
    domain: (data, domain, state) =>
        domainOf(data) === domain
            ? data
            : state.problems.add("domain", data, domain),
    objectKind: checkObjectKind,
    bound: checkBound,
    requiredProps: checkRequiredProps,
    optionalProps: checkOptionalProps,
    branches: (data, branches, state) => state.traverseBranches(data, branches),
    switch: (data, rule, state) => {
        const dataAtPath = getPath(data, rule.path)
        const caseKey = serializeCase(rule.kind, dataAtPath)
        if (hasKey(rule.cases, caseKey)) {
            return checkEntries(data, rule.cases[caseKey], state)
        }
        const caseKeys = keysOf(rule.cases)
        const missingCasePath = state.path.concat(rule.path)
        return rule.kind === "value"
            ? state.problems.add(
                  "valueBranches",
                  dataAtPath,
                  caseKeys.map((k) =>
                      deserializePrimitive(k as SerializedPrimitive)
                  ),
                  { path: missingCasePath }
              )
            : state.problems.add(
                  "domainBranches",
                  dataAtPath,
                  caseKeys as Domain[],
                  { path: missingCasePath }
              )
    },
    alias: (data, name, state) => state.traverseResolution(data, name),
    class: checkClass,
    // TODO: fix
    narrow: (data, narrow, state) =>
        narrow(data, state.problems) ? data : state.problems[0],
    config: (data, { config, node }, state) => {
        state.configs.push(config)
        const result = traverse(data, node, state)
        state.configs.pop()
        return result
    },
    value: (data, value, state) =>
        data === value ? data : state.problems.add("value", data, value),
    morph: (data, morph) => {
        if (typeof morph === "function") {
            return morph(data)!
        }
        let out = data as TraversalReturn
        for (const chainedMorph of morph) {
            out = chainedMorph(out)!
        }
        return out
    }
} satisfies {
    [k in TraversalKey]: EntryTraversal<k>
}

type MorphableKey = extend<
    TraversalKey,
    | "morph"
    | "alias"
    | "branches"
    | "config"
    | "domains"
    | "optionalProps"
    | "requiredProps"
    | "switch"
    | "objectKind"
>

// a morphable key could actually return anything, but we use {} to ensure
// an explicit return. Use ! as needed.
type TraversalReturn = {}

export type EntryTraversal<k extends TraversalKey> = <data extends RuleData<k>>(
    data: data,
    constraint: TraversalValue<k>,
    state: TraversalState
) => k extends MorphableKey ? TraversalReturn : data | Problem

export type ConstrainedRuleTraversalData = extend<
    { [k in TraversalKey]?: unknown },
    {
        regex: string
        divisor: number
        bound: SizedData
        requiredProps: Dict
        optionalProps: Dict
        objectKind: object
        class: object
    }
>

export type RuleData<k extends TraversalKey> =
    k extends keyof ConstrainedRuleTraversalData
        ? ConstrainedRuleTraversalData[k]
        : unknown
