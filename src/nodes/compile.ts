import type { ProblemCode, ProblemRules } from "../nodes/problems.ts"
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

export const createTraverse = (name: string, js: string) =>
    Function(`return (data, state) => {
${js} 
}`)()

export const compileType = (type: Type): string => {
    const state = new Compilation(type)
    return compileNode(type.node, state)
}

export const compileNode = (node: Node, c: Compilation) => {
    if (typeof node === "string") {
        // TODO: improve
        const js = c.type.scope.resolve(node).js
        return c.path.length
            ? js.replace("data", `data.${c.path.join(".")}`)
            : js
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
            return domainCheck
        }
        const checks = compilePredicate(predicate, c)
        if (checks && !hasImpliedDomain(predicate)) {
            return `${domainCheck} && ${checks}`
        }
        return checks
    }
    // const result = {}
    // for (const domain of domains) {
    //     result[domain] = compilePredicate(node[domain]!, state)
    // }
    return `console.log("unimplemented!")` //[["domains", result]]
}

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
}

const initializeCompilationConfig = (): TraversalConfig => ({
    mustBe: [],
    keys: []
})

export class Compilation {
    path = new Path()
    lastDomain: Domain = "undefined"
    failFast = false
    traversalConfig = initializeCompilationConfig()
    readonly rootScope: Scope

    constructor(public type: Type) {
        this.rootScope = type.scope
    }

    check<code extends ProblemCode, condition extends string>(
        code: code,
        condition: condition,
        rule: ProblemRules[code]
    ) {
        return `${condition} || ${this.problem(code, rule)}` as const
    }

    get data() {
        // TODO: Fix props that cannot be accessed via .
        return this.path.length ? `data.${this.path.join(".")}` : "data"
    }

    problem<code extends ProblemCode>(code: code, rule: ProblemRules[code]) {
        return `state.reject("${code}", ${
            typeof rule === "function" ? rule.name : JSON.stringify(rule)
        }, ${this.data}, ${this.path.json})` as const
    }

    // getProblemConfig<code extends ProblemCode>(
    //     code: code
    // ): ProblemWriters<code> {
    //     const result = {} as ProblemWriters<code>
    //     for (const k of problemWriterKeys) {
    //         result[k] =
    //             this.traversalConfig[k][0] ??
    //             (this.rootScope.config.codes[code][k] as any)
    //     }
    //     return result
    // }

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
}
