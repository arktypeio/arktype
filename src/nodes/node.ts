import type { TypeConfig } from "../type.js"
import type { Domain } from "../utils/domains.js"
import type { constructor, evaluate, instanceOf } from "../utils/generics.js"
import { CompiledFunction } from "../utils/generics.js"
import { Path, toPropChain } from "../utils/paths.js"
import { stringify } from "../utils/serialize.js"
import type { PredicateDefinition } from "./predicate.js"
import type { ProblemCode, ProblemRules } from "./problems.js"
import type { RangeNode } from "./range.js"
import type { TypeNode } from "./type.js"

type BaseAssertion = `data${string}` | `typeof data${string}`

type parenthesizable<s extends string> = s | `(${s}`

type negatable<s extends string> = s | `!${s}`

export type CompiledAssertion = evaluate<
    negatable<parenthesizable<parenthesizable<BaseAssertion>>>
>

export type NodeSubclass<subclass extends NodeSubclass<any>> = {
    readonly kind: NodeKind
    new (...args: any[]): Node<subclass>
    compile(definition: any): CompiledAssertion
    intersect(
        l: instanceOf<subclass>,
        r: instanceOf<subclass>
    ): instanceOf<subclass> | DisjointNode
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
    input = any,
    narrowed extends input = input
> {
    declare kind: subclass["kind"]
    declare key: CompiledAssertion
    declare allows: (data: input) => data is narrowed

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
        this.allows = new CompiledFunction<(data: input) => data is narrowed>(
            "data",
            `return ${key}`
        )
        this.kind = kind
        this.key = key
        Node.#cache[kind][key] = this
    }

    #intersections: Record<string, instanceOf<subclass> | DisjointNode> = {}
    intersect(other: instanceOf<subclass>) {
        this.#intersections[other.key] ??= this.subclass.intersect(
            this as instanceOf<subclass>,
            other
        )
        return this.#intersections[other.key]
    }

    abstract compileTraversal(s: CompilationState): string
}

// TODO: multiple disjoints
// intersect ["===", 5], ["===", "foo"]
// const disjoints = {
//     domain: {
//         l: "number",
//         r: "string"
//     },
//     value: {
//         l: 5,
//         r: "foo"
//     }
// }

export type Disjoint = {
    domain?: {
        l: Domain
        r: Domain
    }
    range?: {
        l: RangeNode
        r: RangeNode
    }
    class?: {
        l: constructor
        r: constructor
    }
    value?: {
        l: unknown
        r: unknown
    }
    leftAssignability?: {
        l: unknown
        r: PredicateDefinition
    }
    rightAssignability?: {
        l: PredicateDefinition
        r: unknown
    }
    union?: {
        l: TypeNode
        r: TypeNode
    }
}

export type DisjointsByPath = Record<string, Disjoint>

export type DisjointKind = keyof Disjoint

export class DisjointNode {
    constructor(public byPath: DisjointsByPath) {}

    static from(disjoint: Disjoint) {
        return new DisjointNode({ data: disjoint })
    }

    toString() {
        return stringify(this.byPath)
    }
}

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

    ifThen<condition extends string, onTrue extends string>(
        condition: condition,
        onTrue: onTrue
    ) {
        return `if (${condition}) {
            ${onTrue}
        }`
    }

    ifNotThen<condition extends string, onFalse extends string>(
        condition: condition,
        onFalse: onFalse
    ) {
        return `if (!(${condition})) {
            ${onFalse}
        }`
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
