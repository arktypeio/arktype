import type { ProblemCode, ProblemRules } from "../nodes/problems.ts"
import { as } from "../parse/definition.ts"
import type { Domain } from "../utils/domains.ts"
import type { extend } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import type { BranchDefinition } from "./branch.ts"
import type { DomainNode } from "./rules/domain.ts"
import type { EqualityNode } from "./rules/equality.ts"
import type { InstanceNode } from "./rules/instance.ts"
import type { RangeNode } from "./rules/range.ts"
import type { CheckResult } from "./traverse.ts"
import type { inferIn, inferOut, TypeConfig } from "./type.ts"
import { Union } from "./union.ts"

type NodeClass<args extends any[]> = {
    new (...args: args): Node<NodeClass<args>>

    intersect(
        l: Node<NodeClass<args>>,
        r: Node<NodeClass<args>>,
        s: ComparisonState
    ): Node<NodeClass<args>> | Disjoint

    compile(...args: [...args: args, s: CompilationState]): string
}

export abstract class Node<
    subclass extends NodeClass<ConstructorParameters<subclass>>,
    t = unknown
> extends Function {
    private args: ConstructorParameters<subclass>

    compiled: string

    constructor(
        protected subclass: subclass,
        ...args: ConstructorParameters<subclass>
    ) {
        // TOOD: Cache
        const defaultState = new CompilationState()
        const compiled = subclass.compile(...args, defaultState)
        super("data", `return ${compiled}`)
        this.args = args
        this.compiled = compiled
    }

    declare [as]: t

    declare infer: inferOut<t>

    declare inferIn: inferIn<t>

    // TODO: don't mutate
    allows(data: unknown): data is inferIn<t> {
        return !data
    }

    assert(data: unknown): inferOut<t> {
        const result = this.call(null, data)
        return result.problems ? result.problems.throw() : result.data
    }

    declare apply: (
        thisArg: null,
        args: [data: unknown]
    ) => CheckResult<inferOut<t>>

    declare call: (thisArg: null, data: unknown) => CheckResult<inferOut<t>>

    compile(s: CompilationState) {
        return this.subclass.compile(...this.args, s)
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
            r: BranchDefinition
        }
        rightAssignability: {
            l: BranchDefinition
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

export class Disjoint<kind extends DisjointKind = DisjointKind> extends Union {
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
