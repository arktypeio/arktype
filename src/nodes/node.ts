import type { evaluate, instanceOf } from "../utils/generics.js"
import { CompiledFunction } from "../utils/generics.js"
import type { CompilationState } from "./compilation.js"
import { Disjoint } from "./disjoint.js"
import type { CompiledPath } from "./utils.js"
import { In } from "./utils.js"

type BaseAssertion =
    | `${CompiledPath}${string}`
    | `typeof ${CompiledPath}${string}`

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
    ): instanceOf<subclass> | Disjoint
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
        this.key = key
        this.kind = kind
        this.allows = new CompiledFunction<(data: input) => data is narrowed>(
            In,
            `return ${key}`
        )
        Node.#cache[kind][key] = this
    }

    #intersections: Record<string, instanceOf<subclass> | Disjoint> = {}
    intersect(other: instanceOf<subclass>) {
        if (this.key === other.key) {
            return this as instanceOf<subclass>
        }
        if (this.#intersections[other.key]) {
            return this.#intersections[other.key]
        }
        const result = this.subclass.intersect(
            this as instanceOf<subclass>,
            other
        )
        this.#intersections[other.key] = result
        other.#intersections[this.key] =
            result instanceof Disjoint ? result.invert() : result
        return result
    }

    abstract compileTraverse(s: CompilationState): string
}
