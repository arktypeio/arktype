import type { ProblemCode, ProblemRules } from "../nodes/problems.ts"
import type { Scope } from "../scopes/scope.ts"
import type { Type, TypeConfig } from "../scopes/type.ts"
import type { Domain } from "../utils/domains.ts"
import type { constructor, extend } from "../utils/generics.ts"
import { entriesOf, keysOf, listFrom } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type { BranchNode, ValueNode } from "./branch.ts"
import type { InstanceRule } from "./rules/instance.ts"
import type { RangeNode } from "./rules/range.ts"
import type { EqualityRule } from "./rules/value.ts"

export abstract class Node<subclass extends Node = any> {
    constructor(public readonly id: string) {}

    abstract intersect(
        other: subclass,
        s: ComparisonState
    ): subclass | DisjointContext

    abstract compile(c: Compilation): string
}

export type DisjointKinds = extend<
    Record<string, { l: unknown; r: unknown }>,
    {
        domain: {
            l: Domain
            r: Domain
        }
        range: {
            l: RangeNode
            r: RangeNode
        }
        class: {
            l: InstanceRule
            r: InstanceRule
        }
        value: {
            l: EqualityRule
            r: EqualityRule
        }
        leftAssignability: {
            l: EqualityRule
            r: BranchNode
        }
        rightAssignability: {
            l: BranchNode
            r: EqualityRule
        }
        union: {
            l: BranchNode[]
            r: BranchNode[]
        }
    }
>

export type DisjointKind = keyof DisjointKinds

export class ComparisonState {
    path = new Path()
    disjointsByPath: DisjointsByPath = {}

    constructor() {}

    addDisjoint<kind extends DisjointKind>(
        kind: kind,
        l: DisjointKinds[kind]["l"],
        r: DisjointKinds[kind]["r"]
    ) {
        const result = { kind, l, r } as DisjointContext<kind>
        this.disjointsByPath[`${this.path}`] = result
        return result
    }
}

export type DisjointsByPath = Record<string, DisjointContext>

export type DisjointContext<kind extends DisjointKind = DisjointKind> = {
    kind: kind
} & DisjointKinds[kind]

export const createTraverse = (name: string, js: string) =>
    Function(`return (data, state) => {
${js} 
}`)()

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
        return `(${condition} || ${this.problem(code, rule)})` as const
    }

    mergeChecks(checks: string[]) {
        if (checks.length === 1) {
            return checks[0]
        }
        let result = `(() => {
let valid = ${checks[0]};\n`
        for (let i = 1; i < checks.length - 1; i++) {
            result += `valid = ${checks[i]} && valid;\n`
        }
        result += `return ${checks[checks.length - 1]} && valid
})()`
        return result
    }

    get data() {
        return this.path.toPropChain()
    }

    problem<code extends ProblemCode>(code: code, rule: ProblemRules[code]) {
        return `state.reject("${code}", ${
            typeof rule === "function" ? rule.name : JSON.stringify(rule)
        }, ${this.data}, ${this.path.json})` as const
    }

    arrayOf(node: Node) {
        // TODO: increment. does this work for logging?
        this.path.push("${i}")
        const result = `(() => {
    let valid = true;
    for(let i = 0; i < ${this.data}.length; i++) {
        valid = ${this.node(node)} && isValid;
    }
    return valid
})()`
        this.path.pop()
        return result
    }

    compileDomainCondition = (domain: Domain) =>
        domain === "object"
            ? `(typeof ${this.data} === "object" && ${this.data} !== null) || typeof ${this.data} === "function"`
            : domain === "null" || domain === "undefined"
            ? `${this.data} === ${domain}`
            : `typeof ${this.data} === "${domain}"`

    #hasImpliedDomain(predicate: Predicate) {
        return (
            predicate !== true &&
            listFrom(predicate).every((branch) => {
                const rules = isTransformationBranch(branch)
                    ? branch.rules
                    : branch
                return "value" in rules || rules.instance
            })
        )
    }

    node(node: Node) {
        if (typeof node === "string") {
            return (
                this.type.scope
                    .resolve(node)
                    // TODO: improve
                    .js.replaceAll("data", this.path.toPropChain())
            )
        }
        if (isConfigNode(node)) {
            return this.compileConfigNode(node)
        }
        const domains = keysOf(node)
        if (domains.length === 1) {
            const domain = domains[0]
            const predicate = node[domain]!
            const domainCheck = this.check(
                "domain",
                this.compileDomainCondition(domain),
                domain
            )
            if (predicate === true) {
                return domainCheck
            }
            const checks = compilePredicate(predicate, this)
            if (!this.#hasImpliedDomain(predicate)) {
                return domainCheck + checks
            }
            return checks
        }
        // const result = {}
        // for (const domain of domains) {
        //     result[domain] = compilePredicate(node[domain]!, state)
        // }
        return `console.log("unimplemented!")` //[["domains", result]]
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

    compileConfigNode(node: ConfigNode): string {
        const configEntries = entriesOf(node.config)
        for (const entry of configEntries) {
            this.traversalConfig[entry[0]].unshift(entry[1] as any)
        }
        const result = this.node(node.node)
        for (const entry of configEntries) {
            this.traversalConfig[entry[0]].shift()
        }
        return result
    }
}
