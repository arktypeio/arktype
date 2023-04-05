import type { ProblemCode, ProblemRules } from "../nodes/problems.ts"
import type { Domain } from "../utils/domains.ts"
import type { extend } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import { Constraints } from "./constraints.ts"
import type { ConstraintsDefinition } from "./constraints.ts"
import type { DomainNode } from "./domain.ts"
import type { EqualityNode } from "./equality.ts"
import type { InstanceNode } from "./instance.ts"
import type { RangeNode } from "./range.ts"
import { Type, type TypeConfig } from "./type.ts"
import { Union } from "./union.ts"

type NodeSubclass<subclass extends NodeSubclass<any>> = {
    new (...args: any[]): Node<subclass>

    intersection(
        l: Node<subclass>,
        r: Node<subclass>,
        s: ComparisonState
    ): Node<subclass> | Disjoint

    compile(children: any, s: CompilationState): string
}

export type AllowsCheck = (data: unknown) => boolean

export abstract class Node<
    subclass extends NodeSubclass<subclass> = NodeSubclass<any>
> {
    compiled: string
    allows: AllowsCheck

    constructor(
        protected subclass: subclass,
        public rule: Parameters<subclass["compile"]>[0]
    ) {
        const defaultState = new CompilationState()
        const compiled = subclass.compile(rule, defaultState)
        // TODO: Cache
        this.compiled = compiled
        this.allows = new Function("data", `return ${compiled}`) as AllowsCheck
    }

    compile(s: CompilationState) {
        return this.subclass.compile(this.rule, s)
    }

    // protected abstract intersect(
    //     other: Node,
    //     s: ComparisonState
    // ): Node | Disjoint

    // extends(other: subclass) {
    //     return (
    //         this.intersect(other, new ComparisonState()) ===
    //         (this as unknown as subclass)
    //     )
    // }

    // subsumes(other: subclass) {
    //     return !this.extends(other)
    // }

    isDisjoint(): this is Disjoint {
        return this instanceof Disjoint
    }
}

export abstract class TypeNode<
    subclass extends NodeSubclass<subclass> = NodeSubclass<any>
> extends Node<subclass> {
    abstract branches: Constraints[]

    intersect(other: TypeNode, s: ComparisonState): TypeNode {
        if (this === other) {
            return this
        }
        if (this.branches.length === 1 && other.branches.length === 1) {
            const result = Constraints.intersection(
                this.branches[0],
                other.branches[0],
                s
            )
            return result
        }
        const branches = branchwiseIntersection(l.rule, r.rule, s)
        return branches.length
            ? new Union(branches)
            : s.addDisjoint("union", l, r)
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
            r: ConstraintsDefinition
        }
        rightAssignability: {
            l: ConstraintsDefinition
            r: EqualityNode
        }
        union: {
            l: Union
            r: Union
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

type DisjointContext<kind extends DisjointKind = DisjointKind> = {
    kind: kind
    l: DisjointKinds[kind]["l"]
    r: DisjointKinds[kind]["r"]
}

export class Disjoint<
    kind extends DisjointKind = DisjointKind
> extends TypeNode<typeof Disjoint> {
    branches = []

    constructor(
        public kind: kind,
        public l: DisjointKinds[kind]["l"],
        public r: DisjointKinds[kind]["r"]
    ) {
        const context: DisjointContext<kind> = {
            kind,
            l,
            r
        }
        super(Disjoint, context)
    }

    static compile(context: DisjointContext) {
        return `throw new Error(${context.l})`
    }

    static intersection(l: Disjoint) {
        return l
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

export class CompilationState {
    path = new Path()
    lastDomain: Domain = "undefined"
    failFast = false
    traversalConfig = initializeCompilationConfig()

    constructor() {}

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

    arrayOf(node: Node<any>) {
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
