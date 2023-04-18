import type { TypeConfig } from "../type.js"
import type { Domain } from "../utils/domains.js"
import type { extend, instanceOf } from "../utils/generics.js"
import { CompiledFunction } from "../utils/generics.js"
import { Path, toPropChain } from "../utils/paths.js"
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
    compileChildren(children: any, s: CompilationState): CompiledValidator[]
}

export abstract class Node<
    subclass extends NodeSubclass<subclass> = NodeSubclass<any>,
    input = any
> extends CompiledFunction<[data: input], boolean> {
    constructor(
        protected subclass: subclass,
        public child: Parameters<subclass["compileChildren"]>[0]
    ) {
        // TODO: Cache
        super(
            "data",
            `return ${Node.joinSubconditions(
                subclass.compileChildren(child, new CompilationState("check"))
            )}`
        )
    }

    static joinSubconditions(validators: CompiledValidator[]) {
        return validators.map((validator) => validator.condition).join(" || ")
    }

    compile(s: CompilationState) {
        const children = this.subclass.compileChildren(this.child, s)
        return s.kind === "check"
            ? Node.joinSubconditions(children)
            : children
                  .map(
                      (validator) => `if (${validator.condition}) {
        ${validator.problem}
    }`
                  )
                  .join("\n")
    }

    compileChildren(s: CompilationState) {
        return this.subclass.compileChildren(this.child, s)
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
    unionDepth = 0
    traversalConfig = initializeCompilationConfig()

    constructor(public kind: "traversal" | "check") {}

    get data() {
        return toPropChain(this.path)
    }

    problem<code extends ProblemCode>(code: code, rule: ProblemRules[code]) {
        return `${
            this.unionDepth ? "return " : ""
        }state.addProblem("${code}", ${
            typeof rule === "function" ? rule.name : JSON.stringify(rule)
        }, ${this.data}, ${this.path.json})` as const
    }

    //     arrayOf(node: Node<any>) {
    //         // TODO: increment. does this work for logging?
    //         this.path.push("${i}")
    //         const result = `(() => {
    //     let valid = true;
    //     for(let i = 0; i < ${this.data}.length; i++) {
    //         valid = ${node.compile(this)} && isValid;
    //     }
    //     return valid
    // })()`
    //         this.path.pop()
    //         return result
    //     }
}
