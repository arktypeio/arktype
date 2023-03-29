import type { ProblemCode, ProblemRules } from "../nodes/problems.ts"
import type { Scope } from "../scopes/scope.ts"
import type { Type, TypeConfig } from "../scopes/type.ts"
import type { Domain } from "../utils/domains.ts"
import type { extend } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import type { BranchNode } from "./branch.ts"
import type { InstanceRule } from "./rules/instance.ts"
import type { RangeRule } from "./rules/range.ts"
import type { EqualityRule } from "./rules/value.ts"
import { TypeNode } from "./type.ts"

export abstract class Node<subclass extends Node = any> {
    constructor(public readonly id: string) {}

    abstract intersect(other: subclass, s: ComparisonState): subclass | Disjoint

    isDisjoint(): this is Disjoint {
        return this instanceof Disjoint
    }

    abstract compile(c: Compilation): string

    abstract allows(value: unknown): boolean
}

export type DisjointKinds = extend<
    Record<string, { l: unknown; r: unknown }>,
    {
        domain: {
            l: Domain
            r: Domain
        }
        range: {
            l: RangeRule
            r: RangeRule
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
        const result = new Disjoint(kind, l, r)
        this.disjointsByPath[`${this.path}`] = result
        return result
    }
}

export class Disjoint<
    kind extends DisjointKind = DisjointKind
> extends TypeNode {
    constructor(
        public kind: kind,
        public l: DisjointKinds[kind]["l"],
        public r: DisjointKinds[kind]["r"]
    ) {
        super()
    }

    toString() {
        return `intersection of ${this.l} and ${this.r}`
    }
}

export type DisjointsByPath = Record<string, Disjoint>

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
        valid = ${node.compile(this)} && isValid;
    }
    return valid
})()`
        this.path.pop()
        return result
    }
}
