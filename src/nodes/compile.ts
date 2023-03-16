import type {
    ProblemCode,
    ProblemOptions,
    ProblemWriters
} from "../nodes/problems.ts"
import type { Scope } from "../scopes/scope.ts"
import type { Type, TypeConfig } from "../scopes/type.ts"
import type { Domain } from "../utils/domains.ts"
import { entriesOf, keysOf, listFrom } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import { isTransformationBranch } from "./branch.ts"
import type { ConfigNode, DomainsNode, Node } from "./node.ts"
import { isConfigNode } from "./node.ts"
import type { Predicate } from "./predicate.ts"
import { compilePredicate } from "./predicate.ts"

export const compileJs = (name: string, steps: string[]) =>
    `return (data, state) => {
${steps.join(";\n")} 
}` as const

export const compileType = (type: Type): string[] => {
    const state = new Compilation(type)
    return compileNode(type.node, state)
}

export const compileNode = (node: Node, c: Compilation) => {
    if (typeof node === "string") {
        // TODO: improve
        const lines = c.type.scope.resolve(node).steps
        return c.path.length
            ? lines.map((line) =>
                  line.replace("data", `data.${c.path.join(".")}`)
              )
            : lines
    }
    return isConfigNode(node)
        ? c.compileConfigNode(node)
        : compileTypeNode(node, c)
}

const compileDomainCheck = (domain: Domain, data: string) =>
    domain === "object"
        ? `(typeof ${data} === "object" && ${data} !== null) || typeof ${data} === "function"`
        : domain === "null" || domain === "undefined"
        ? `${data} === ${domain}`
        : `typeof ${data} === "${domain}"`

const hasImpliedDomain = (predicate: Predicate) =>
    predicate !== true &&
    listFrom(predicate).every((branch) => {
        const rules = isTransformationBranch(branch) ? branch.rules : branch
        return "value" in rules || rules.instance
    })

const compileTypeNode = (node: DomainsNode, c: Compilation) => {
    const domains = keysOf(node)
    if (domains.length === 1) {
        const domain = domains[0]
        const predicate = node[domain]!
        const domainCheck = c.check(
            "domain",
            compileDomainCheck(domain, c.data),
            domain
        )
        if (predicate === true) {
            return [domainCheck]
        }
        const checks = compilePredicate(predicate, c)
        if (!hasImpliedDomain(predicate)) {
            checks.unshift(domainCheck)
        }
        return checks
    }
    // const result = {}
    // for (const domain of domains) {
    //     result[domain] = compilePredicate(node[domain]!, state)
    // }
    return [] //[["domains", result]]
}

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
}

const initializeCompilationConfig = (): TraversalConfig => ({
    mustBe: [],
    writeReason: [],
    was: [],
    keys: []
})

type ProblemWriterKey = keyof ProblemOptions

const problemWriterKeys: readonly ProblemWriterKey[] = [
    "mustBe",
    "writeReason",
    "was"
]

export class Compilation {
    path = new Path()
    failFast = false
    traversalConfig = initializeCompilationConfig()
    readonly rootScope: Scope

    constructor(public type: Type) {
        this.rootScope = type.scope
    }

    check<code extends ProblemCode, condition extends string>(
        code: code,
        condition: condition,
        requirement: ProblemRequirement<code>
    ) {
        return `${condition} || ${this.problem(code, requirement)}` as const
    }

    get data() {
        // TODO: Fix props that cannot be accessed via .
        return this.path.length ? `data.${this.path.join(".")}` : "data"
    }

    problem<
        code extends ProblemCode,
        requirement extends ProblemRequirement<code>
    >(code: code, requirement: requirement) {
        return `state.reject("${code}", ${JSON.stringify(
            requirement
        )}, { path: ${this.path.json}, data: ${this.data} } )` as const
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

    compileConfigNode(node: ConfigNode) {
        const configEntries = entriesOf(node.config)
        for (const entry of configEntries) {
            this.traversalConfig[entry[0]].unshift(entry[1] as any)
        }
        const result = compileTypeNode(node.node, this)
        for (const entry of configEntries) {
            this.traversalConfig[entry[0]].shift()
        }
        return result
    }

    // traverseKey(key: stringKeyOf<this["data"]>, node: TraversalNode): boolean {
    //     const lastData = this.data
    //     this.data = this.data[key] as data
    //     this.path.push(key)
    //     const isValid = traverse(node, this)
    //     this.path.pop()
    //     if (lastData[key] !== this.data) {
    //         lastData[key] = this.data as any
    //     }
    //     this.data = lastData
    //     return isValid
    // }

    // traverseResolution(name: string): boolean {
    //     const resolution = this.type.scope.resolve(name)
    //     const id = resolution.qualifiedName
    //     // this assignment helps with narrowing
    //     const data = this.data
    //     const isObject = hasDomain(data, "object")
    //     if (isObject) {
    //         const seenByCurrentType = this.#seen[id]
    //         if (seenByCurrentType) {
    //             if (seenByCurrentType.includes(data)) {
    //                 // if data has already been checked by this alias as part of
    //                 // a resolution higher up on the call stack, it must be valid
    //                 // or we wouldn't be here
    //                 return true
    //             }
    //             seenByCurrentType.push(data)
    //         } else {
    //             this.#seen[id] = [data]
    //         }
    //     }
    //     const lastType = this.type
    //     this.type = resolution
    //     const isValid = traverse(resolution.flat, this)
    //     this.type = lastType
    //     if (isObject) {
    //         this.#seen[id]!.pop()
    //     }
    //     return isValid
    // }

    // traverseBranches(branches: TraversalEntry[][]): boolean {
    //     const lastFailFast = this.failFast
    //     this.failFast = true
    //     const lastProblems = this.problems
    //     const branchProblems = new Problems(this)
    //     this.problems = branchProblems
    //     const lastPath = this.path
    //     const lastKeysToPrune = this.entriesToPrune
    //     let hasValidBranch = false
    //     for (const branch of branches) {
    //         this.path = new Path()
    //         this.entriesToPrune = []
    //         if (checkEntries(branch, this)) {
    //             hasValidBranch = true
    //             lastKeysToPrune.push(...this.entriesToPrune)
    //             break
    //         }
    //     }
    //     this.path = lastPath
    //     this.entriesToPrune = lastKeysToPrune
    //     this.problems = lastProblems
    //     this.failFast = lastFailFast
    //     return hasValidBranch || !this.problems.add("branches", branchProblems)
    // }
}

// export const checkEntries = (
//     entries: TraversalEntry[],
//     state: CompilationState
// ): boolean => {
//     let isValid = true
//     for (let i = 0; i < entries.length; i++) {
//         const [k, v] = entries[i]
//         const entryAllowsData = (entryCheckers[k] as EntryChecker<any>)(
//             v,
//             state
//         )
//         isValid &&= entryAllowsData
//         if (!isValid) {
//             if (state.failFast) {
//                 return false
//             }
//             if (
//                 i < entries.length - 1 &&
//                 precedenceMap[k] < precedenceMap[entries[i + 1][0]]
//             ) {
//                 // if we've encountered a problem, there is at least one entry
//                 // remaining, and the next entry is of a higher precedence level
//                 // than the current entry, return immediately
//                 return false
//             }
//         }
//     }
//     return isValid
// }

// export const checkRequiredProp = (
//     prop: TraversalProp,
//     state: CompilationState<TraversableData>
// ) => {
//     if (prop[0] in state.data) {
//         return state.traverseKey(prop[0], prop[1])
//     }
//     state.problems.add("missing", undefined, {
//         path: state.path.concat(prop[0]),
//         data: undefined
//     })
//     return false
// }

// const createPropChecker =
//     (kind: PropsRecordKey) =>
//     (props: PropsRecordEntry[1], state: CompilationState<TraversableData>) => {
//         let isValid = true
//         const remainingUnseenRequired = { ...props.required }
//         for (const k in state.data) {
//             if (props.required[k]) {
//                 isValid &&= state.traverseKey(k, props.required[k])
//                 delete remainingUnseenRequired[k]
//             } else if (props.optional[k]) {
//                 isValid &&= state.traverseKey(k, props.optional[k])
//             } else if (kind === "distilledProps") {
//                 if (state.failFast) {
//                     // If we're in a union (i.e. failFast is enabled) in
//                     // distilled mode, we need to wait to prune distilled keys
//                     // to avoid mutating data based on a branch that will not be
//                     // included in the final result. Instead, we push the object
//                     // and key to state to handle after traversal is complete.
//                     state.entriesToPrune.push([state.data, k])
//                 } else {
//                     // If we're not in a union, we can safely distill right away
//                     delete state.data[k]
//                 }
//             } else {
//                 isValid = false
//                 state.problems.add("extraneous", state.data[k], {
//                     path: state.path.concat(k)
//                 })
//             }
//             if (!isValid && state.failFast) {
//                 return false
//             }
//         }
//         const unseenRequired = Object.keys(remainingUnseenRequired)
//         if (unseenRequired.length) {
//             for (const k of unseenRequired) {
//                 state.problems.add("missing", undefined, {
//                     path: state.path.concat(k)
//                 })
//             }
//             return false
//         }
//         return isValid
//     }

// const entryCheckers = {
//     regex: checkRegex,
//     divisor: compileDivisorCheck,
//     domains: (domains, state) => {
//         const entries = domains[domainOf(state.data)]
//         return entries
//             ? checkEntries(entries, state)
//             : !state.problems.add(
//                   "cases",
//                   domainsToDescriptions(keysOf(domains))
//               )
//     },
//     domain: (domain, state) =>
//         domainOf(state.data) === domain ||
//         !state.problems.add("domain", domain),
//     bound: checkBound,
//     optionalProp: (prop, state) => {
//         if (prop[0] in state.data) {
//             return state.traverseKey(prop[0], prop[1])
//         }
//         return true
//     },
//     // these checks work the same way, the keys are only distinct so that
//     // prerequisite props can have a higher precedence
//     requiredProp: checkRequiredProp,
//     prerequisiteProp: checkRequiredProp,
//     indexProp: (node, state) => {
//         if (!Array.isArray(state.data)) {
//             state.problems.add("class", "Array")
//             return false
//         }
//         let isValid = true
//         for (let i = 0; i < state.data.length; i++) {
//             isValid &&= state.traverseKey(`${i}`, node)
//             if (!isValid && state.failFast) {
//                 return false
//             }
//         }
//         return isValid
//     },
//     branches: (branches, state) => state.traverseBranches(branches),
//     switch: (rule, state) => {
//         const dataAtPath = getPath(state.data, rule.path)
//         const caseKey = serializeCase(rule.kind, dataAtPath)
//         if (hasKey(rule.cases, caseKey)) {
//             return checkEntries(rule.cases[caseKey], state)
//         }
//         const caseKeys = keysOf(rule.cases)
//         const missingCasePath = state.path.concat(rule.path)
//         const caseDescriptions =
//             rule.kind === "value"
//                 ? caseKeys
//                 : rule.kind === "domain"
//                 ? domainsToDescriptions(caseKeys as Domain[])
//                 : rule.kind === "class"
//                 ? objectKindsToDescriptions(caseKeys as DefaultObjectKind[])
//                 : /* c8 ignore start*/
//                   throwInternalError(
//                       `Unexpectedly encountered rule kind '${rule.kind}' during traversal`
//                   )
//         /* c8 ignore stop*/
//         state.problems.add("cases", caseDescriptions, {
//             path: missingCasePath,
//             data: dataAtPath
//         })
//         return false
//     },
//     alias: (name, state) => state.traverseResolution(name),
//     class: compileClassCheck,
//     narrow: (narrow, state) => {
//         const lastProblemsCount = state.problems.count
//         const result = narrow(state.data, state.problems)
//         if (!result && state.problems.count === lastProblemsCount) {
//             state.problems.mustBe(
//                 narrow.name ? `valid according to ${narrow.name}` : "valid"
//             )
//         }
//         return result
//     },
//     config: ({ config, node }, state) => state.compileConfigNode(config, node),
//     value: (value, state) =>
//         state.data === value || !state.problems.add("value", value),
//     morph: (morph, state) => {
//         const out = morph(state.data, state.problems)
//         if (state.problems.length) {
//             return false
//         }
//         if (out instanceof Problem) {
//             // if a problem was returned from the morph but not added, add it
//             state.problems.addProblem(out)
//             return false
//         }
//         if (out instanceof CheckResult) {
//             if (out.problems) {
//                 for (const problem of out.problems) {
//                     state.problems.addProblem(problem)
//                 }
//                 return false
//             }
//             state.data = out.data
//             return true
//         }
//         state.data = out
//         return true
//     },
//     distilledProps: createPropChecker("distilledProps"),
//     strictProps: createPropChecker("strictProps")
// } satisfies {
//     [k in TraversalKey]: EntryChecker<k>
// }
