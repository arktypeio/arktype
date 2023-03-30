import type { ProblemCode, ProblemRules } from "../nodes/problems.ts"
import type { Scope } from "../scopes/scope.ts"
import type { Type, TypeConfig } from "../scopes/type.ts"
import type { Domain } from "../utils/domains.ts"
import type { conform, extend } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import type { RuleSet, validateRuleSet } from "./branch.ts"
import { BranchNode } from "./branch.ts"
import type { DomainNode } from "./rules/domain.ts"
import type { EqualityNode } from "./rules/equality.ts"
import type { InstanceNode } from "./rules/instance.ts"
import type { RangeNode } from "./rules/range.ts"
import { UnionNode } from "./union.ts"

type validateBranches<ruleSets extends readonly RuleSet[]> = {
    [i in keyof ruleSets]: conform<ruleSets[i], validateRuleSet<ruleSets[i]>>
}

export const node = <const branches extends readonly RuleSet[]>(
    ...branches: validateBranches<branches>
) =>
    (branches.length === 1
        ? new BranchNode(branches[0])
        : new UnionNode(branches)) as branches["length"] extends 1
        ? BranchNode<branches[0]>
        : UnionNode<branches>

export abstract class Node<subclass extends Node = any> {
    abstract readonly definition: unknown

    constructor(public readonly id: string) {}

    abstract intersect(other: subclass, s: ComparisonState): subclass | Disjoint

    extends(other: subclass) {
        return (
            this.intersect(other, new ComparisonState()) ===
            (this as unknown as subclass)
        )
    }

    subsumes(other: subclass) {
        return !this.extends(other)
    }

    isDisjoint(): this is Disjoint {
        return this instanceof Disjoint
    }

    abstract compile(c: Compilation): string

    allows(value: unknown) {
        return true
    }
}

export type DisjointKinds = extend<
    Record<string, { l: unknown; r: unknown }>,
    {
        domain: {
            l: DomainNode
            r: DomainNode
        }
        range: {
            l: RangeNode
            r: RangeNode
        }
        class: {
            l: InstanceNode
            r: InstanceNode
        }
        value: {
            l: EqualityNode
            r: EqualityNode
        }
        leftAssignability: {
            l: EqualityNode
            r: BranchNode
        }
        rightAssignability: {
            l: BranchNode
            r: EqualityNode
        }
        union: {
            l: readonly BranchNode[]
            r: readonly BranchNode[]
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
> extends UnionNode<[]> {
    constructor(
        public kind: kind,
        public l: DisjointKinds[kind]["l"],
        public r: DisjointKinds[kind]["r"]
    ) {
        super([])
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
