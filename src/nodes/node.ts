import type { TypeConfig } from "../type.js"
import type { Domain } from "../utils/domains.js"
import type { extend, instanceOf } from "../utils/generics.js"
import { CompiledFunction } from "../utils/generics.js"
import { Path } from "../utils/paths.js"
import type { DomainNode } from "./domain.js"
import type { EqualityNode } from "./equality.js"
import type { InstanceNode } from "./instance.js"
import type { ProblemCode, ProblemRules } from "./problems.js"
import type { RangeNode } from "./range.js"
import type { RuleSet } from "./rules.js"
import type { TypeNode } from "./type.js"

export type CompiledValidator = {
    condition: string
    problem: string
}

type NodeSubclass<subclass extends NodeSubclass<any>> = {
    new (...args: any[]): Node<subclass>
    compile(children: any, s: CompilationState): CompiledValidator[]
}

export abstract class Node<
    subclass extends NodeSubclass<subclass> = NodeSubclass<any>,
    input = any
> extends CompiledFunction<[data: input], boolean> {
    constructor(
        protected subclass: subclass,
        public child: Parameters<subclass["compile"]>[0]
    ) {
        // TODO: Cache
        super(
            "data",
            `return ${Node.joinSubconditions(
                subclass.compile(child, new CompilationState())
            )}`
        )
    }

    static joinSubconditions(validators: CompiledValidator[]) {
        return validators.map((validator) => validator.condition).join(" || ")
    }

    compileTraversal(s: CompilationState) {
        return this.compile(s)
            .map(
                (validator) => `if (${validator.condition}) {
            ${validator.problem}
        }`
            )
            .join("\n")
    }

    compileCondition(s: CompilationState) {
        return Node.joinSubconditions(this.compile(s))
    }

    compile(s: CompilationState) {
        return this.subclass.compile(this.child, s)
    }

    abstract intersect(
        other: instanceOf<subclass>,
        s: ComparisonState
    ): instanceOf<subclass> | Disjoint
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
            r: RuleSet
        }
        rightAssignability: {
            l: RuleSet
            r: EqualityNode
        }
        union: {
            l: TypeNode
            r: TypeNode
        }
    }
>

export type DisjointKind = keyof DisjointKinds

export class ComparisonState {
    path = new Path()
    disjointsByPath: DisjointsByPath = {}

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

export class Disjoint<kind extends DisjointKind = DisjointKind> {
    constructor(
        public kind: kind,
        public l: DisjointKinds[kind]["l"],
        public r: DisjointKinds[kind]["r"]
    ) {}

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

    // traverse<code extends ProblemCode, condition extends string>(
    //     code: code,
    //     condition: condition,
    //     rule: ProblemRules[code]
    // ) {
    //     return `(${condition} || ${this.problem(code, rule)})` as const
    // }

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
        let result = "data"
        for (const segment of this.path) {
            if (typeof segment === "string") {
                if (/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(segment)) {
                    result += `.${segment}`
                } else {
                    result += `[${
                        /^\$\{.*\}$/.test(segment)
                            ? segment.slice(2, -1)
                            : JSON.stringify(segment)
                    }]`
                }
            } else {
                result += `[${segment}]`
            }
        }
        return result
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
