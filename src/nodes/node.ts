import type { instanceOf } from "../utils/generics.js"
import { CompiledFunction } from "../utils/generics.js"
import type { BasisNode } from "./basis.js"
import type { CompilationState } from "./compilation.js"
import { Disjoint } from "./disjoint.js"
import type { DivisibilityNode } from "./divisibility.js"
import type { FilterNode } from "./filter.js"
import type { MorphNode } from "./morph.js"
import type { PredicateNode } from "./predicate.js"
import type { NamedPropNode, PropsNode } from "./props.js"
import type { RangeNode } from "./range.js"
import type { RegexNode } from "./regex.js"
import type { TypeNode } from "./type.js"
import { In } from "./utils.js"

export type NodeSubclass<kind extends NodeKind> = {
    readonly kind: kind
    new (...args: any[]): NodeInstance<kind>
    compile(definition: any): string
    intersect(
        l: NodeInstance<kind>,
        r: NodeInstance<kind>
    ): NodeInstance<kind> | Disjoint
}

export type NodeInstance<kind extends NodeKind = NodeKind> = instanceOf<
    NodeKinds[kind]
>

export type NodeKinds = {
    type: typeof TypeNode
    predicate: typeof PredicateNode
    basis: typeof BasisNode
    divisor: typeof DivisibilityNode
    range: typeof RangeNode
    regex: typeof RegexNode
    props: typeof PropsNode
    namedProp: typeof NamedPropNode
    filter: typeof FilterNode
    morph: typeof MorphNode
}

type NodeKind = keyof NodeKinds

export abstract class Node<
    kind extends NodeKind = NodeKind,
    input = any,
    narrowed extends input = input
> {
    declare kind: kind
    declare key: string
    declare allows: (data: input) => data is narrowed

    static #cache: { [kind in NodeKind]: Record<string, Node<kind>> } = {
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
        protected subclass: NodeSubclass<kind>,
        input: Parameters<NodeKinds[kind]["compile"]>[0]
    ) {
        const kind = subclass.kind
        const key = subclass.compile(input)
        if (Node.#cache[kind][key]) {
            return Node.#cache[kind][key] as any
        }
        this.key = key
        this.kind = kind as kind
        this.allows = new CompiledFunction<(data: input) => data is narrowed>(
            In,
            `return ${key}`
        )
        ;(Node.#cache[kind] as any)[key] = this
    }

    hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
        return this.kind === (kind as any)
    }

    #intersections: Record<string, NodeInstance<kind> | Disjoint> = {}
    intersect(other: NodeInstance<kind>): NodeInstance<kind> | Disjoint {
        if (this.key === other.key) {
            return this as NodeInstance<kind>
        }
        if (this.#intersections[other.key]) {
            return this.#intersections[other.key]
        }
        const result = this.subclass.intersect(
            this as NodeInstance<kind>,
            other
        )
        this.#intersections[other.key] = result
        other.#intersections[this.key] =
            result instanceof Disjoint ? result.invert() : (result as any)
        return result
    }

    abstract compileTraverse(s: CompilationState): string
}
