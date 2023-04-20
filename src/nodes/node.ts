import type { TypeConfig } from "../type.js"
import type { Domain } from "../utils/domains.js"
import type {
    constructor,
    evaluate,
    extend,
    instanceOf
} from "../utils/generics.js"
import { CompiledFunction } from "../utils/generics.js"
import { Path, toPropChain } from "../utils/paths.js"
import type { PredicateDefinition, PredicateNode } from "./predicate.js"
import type { ProblemCode, ProblemRules } from "./problems.js"
import type { RangeNode } from "./range.js"
import type { TypeNode } from "./type.js"

type BaseAssertion = `data${string}` | `typeof data${string}`

type parenthesizable<s extends string> = s | `(${s}`

type negatable<s extends string> = s | `!${s}`

export type CompiledAssertion = evaluate<
    negatable<parenthesizable<parenthesizable<BaseAssertion>>>
>

type NodeSubclass<subclass extends NodeSubclass<any>> = {
    readonly kind: NodeKind
    new (...args: any[]): Node<subclass>
    compile(definition: any): CompiledAssertion
}

type NodeKind =
    | "type"
    | "predicate"
    | "basis"
    | "divisor"
    | "range"
    | "regex"
    | "props"
    | "namedProp"
    | "filter"
    | "morph"

export abstract class Node<
    subclass extends NodeSubclass<subclass> = NodeSubclass<any>,
    input = any
> extends CompiledFunction<[data: input], boolean> {
    declare kind: subclass["kind"]
    declare key: CompiledAssertion

    static #cache: { [kind in NodeKind]: Record<CompiledAssertion, Node> } = {
        type: {},
        predicate: {},
        basis: {},
        divisor: {},
        range: {},
        regex: {},
        props: {},
        namedProp: {},
        filter: {},
        morph: {}
    }

    constructor(
        protected subclass: subclass,
        definition: Parameters<subclass["compile"]>[0]
    ) {
        const kind = subclass.kind
        const key = subclass.compile(definition)
        if (Node.#cache[kind][key]) {
            return Node.#cache[kind][key] as instanceOf<subclass>
        }
        super("data", `return ${key}`)
        this.kind = kind
        this.key = key
        Node.#cache[kind][key] = this
    }

    abstract intersect(
        other: instanceOf<subclass>,
        s: ComparisonState
    ): instanceOf<subclass> | Disjoint
}

export type DisjointKinds = extend<
    Record<string, { l: unknown; r: unknown }>,
    {
        kind: {
            l: Domain
            r: Domain
        }
        range: {
            l: RangeNode
            r: RangeNode
        }
        class: {
            l: constructor
            r: constructor
        }
        value: {
            l: unknown
            r: unknown
        }
        leftAssignability: {
            l: unknown
            r: PredicateDefinition
        }
        rightAssignability: {
            l: PredicateDefinition
            r: unknown
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
    lastkind: Domain = "undefined"
    unionDepth = 0
    traversalConfig = initializeCompilationConfig()

    constructor() {}

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

export const compileTraversal = (root: TypeNode) => {
    const s = new CompilationState()
    switch (root.branches.length) {
        case 0:
            return "throw new Error();"
        case 1:
            return compilePredicate(root.branches[0], s)
        default:
            return compileUnion(root.branches, s)
    }
}

const compileUnion = (branches: PredicateNode[], s: CompilationState) => {
    s.unionDepth++
    const result = `state.pushUnion();
            ${branches
                .map(
                    (rules) => `(() => {
                ${compilePredicate(rules, s)}
                })()`
                )
                .join(" && ")};
            state.popUnion(${branches.length}, ${s.data}, ${s.path.json});`
    s.unionDepth--
    return result
}

const compilePredicate = (predicate: PredicateNode, s: CompilationState) => {
    return predicate.rules
        .map(
            (rule) => `if (!(${rule.key})) {
        ${s.problem("custom", "rule")}
    }`
        )
        .join("\n")
}
