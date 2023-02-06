import type { QualifiedTypeName, Type } from "../main.js"
import { serializeCase } from "../nodes/discriminate.js"
import type {
    TraversalEntry,
    TraversalKey,
    TraversalNode
} from "../nodes/node.js"
import { checkClass } from "../nodes/rules/class.js"
import { checkDivisor } from "../nodes/rules/divisor.js"
import type { TraversalPropEntry } from "../nodes/rules/props.js"
import { checkBound } from "../nodes/rules/range.js"
import { checkRegex } from "../nodes/rules/regex.js"
import { precedenceMap } from "../nodes/rules/rules.js"
import type { SizedData, Subdomain } from "../utils/domains.js"
import { domainOf, hasDomain, subdomainOf } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { Dict, extend, List } from "../utils/generics.js"
import { hasKey, keysOf } from "../utils/generics.js"
import { getPath, Path } from "../utils/paths.js"
import type { SerializedPrimitive } from "../utils/serialize.js"
import { deserializePrimitive, stringify } from "../utils/serialize.js"
import type { Problem } from "./problems.js"
import { Problems } from "./problems.js"

export class TraversalState {
    path = new Path()
    problems = new Problems(this)
    failFast = false

    #seen: { [name in QualifiedTypeName]?: object[] } = {}

    constructor(public type: Type) {}

    traverseResolution(data: unknown, name: string) {
        const resolution = this.type.meta.scope.resolve(name)
        const id = resolution.meta.id
        const isObject = hasDomain(data, "object")
        if (isObject) {
            if (hasKey(this.#seen, id)) {
                if (this.#seen[id].includes(data)) {
                    // if data has already been checked by this alias as part of
                    // a resolution higher up on the call stack, it must be valid
                    // or we wouldn't be here
                    return
                }
                this.#seen[id].push(data)
            } else {
                this.#seen[id] = [data]
            }
        }
        // TODO: type not an accurate reflection of context because not always included
        const lastType = this.type
        this.type = resolution
        traverse(data, resolution.flat, this)
        this.type = lastType
        if (isObject) {
            this.#seen[id]!.pop()
        }
    }

    traverseBranches(data: unknown, branches: TraversalEntry[][]) {
        const lastProblems = this.problems
        const lastPath = this.path
        const lastFailFast = this.failFast
        this.failFast = true
        const branchProblems: Problem[] = []
        for (const branch of branches) {
            this.problems = new Problems(this)
            this.path = new Path()
            checkEntries(data, branch, this)
            if (!this.problems.length) {
                break
            }
            branchProblems.push(this.problems[0])
        }
        this.failFast = lastFailFast
        this.path = lastPath
        this.problems = lastProblems
        if (branchProblems.length === branches.length) {
            this.problems.add("branches", data, branchProblems)
        }
    }
}

export const traverse = (
    data: unknown,
    node: TraversalNode,
    state: TraversalState
) => {
    if (typeof node === "string") {
        if (domainOf(data) !== node) {
            return state.problems.add("domain", data, node)
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
            checkers[k](data as never, v as never, state)
            if (state.problems.length > initialProblemsCount) {
                if (state.failFast) {
                    return
                }
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
                    state.problems.add("missing", undefined, undefined)
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
            return state.problems.add("domain", data, rule)
        }
        return
    }
    if (dataSubdomain !== rule[0]) {
        return state.problems.add("domain", data, rule[0])
    }
    if (dataSubdomain === "Array" && typeof rule[2] === "number") {
        const actual = (data as List).length
        const expected = rule[2]
        if (expected !== actual) {
            return state.problems.add("bound", data as List, {
                comparator: "==",
                limit: expected,
                units: "items"
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
            state.problems.add("domainBranches", data, keysOf(domains))
        }
    },
    domain: (data, domain, state) => {
        if (domainOf(data) !== domain) {
            state.problems.add("domain", data, domain)
        }
    },
    subdomain: checkSubdomain,
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
        const lastPath = state.path
        state.path = state.path.concat(rule.path)
        if (rule.kind === "value") {
            state.problems.add(
                "valueBranches",
                dataAtPath,
                caseKeys.map((k) =>
                    deserializePrimitive(k as SerializedPrimitive)
                )
            )
        } else {
            state.problems.add(
                "domainBranches",
                dataAtPath,
                caseKeys as Subdomain[]
            )
        }
        state.path = lastPath
    },
    alias: (data, name, state) => state.traverseResolution(data, name),
    class: checkClass,
    narrow: (data, narrow, state) => narrow(data, state.problems),
    value: (data, value, state) => {
        if (data !== value) {
            state.problems.add("value", data, value)
        }
    }
} satisfies {
    [k in ValidationKey]: TraversalCheck<k>
}

type ValidationKey = Exclude<TraversalKey, "morph">

export type TraversalCheck<k extends TraversalKey> = (
    data: RuleData<k>,
    rule: Extract<TraversalEntry, [k, unknown]>[1],
    state: TraversalState
) => void

export type ConstrainedRuleTraversalData = extend<
    { [k in TraversalKey]?: unknown },
    {
        regex: string
        divisor: number
        bound: SizedData
        requiredProps: Dict
        optionalProps: Dict
        class: object
    }
>

export type RuleData<k extends TraversalKey> =
    k extends keyof ConstrainedRuleTraversalData
        ? ConstrainedRuleTraversalData[k]
        : unknown
