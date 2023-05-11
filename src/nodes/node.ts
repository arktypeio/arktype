import { CompiledFunction } from "../utils/compiledFunction.js"
import type { instanceOf } from "../utils/objectKinds.js"
import type { BasisNode } from "./basis/basis.js"
import { type CompilationState, In } from "./compilation.js"
import type { DivisorNode } from "./constraints/divisor.js"
import type { MorphNode } from "./constraints/morph.js"
import type { NarrowNode } from "./constraints/narrow.js"
import type { PropsNode } from "./constraints/props.js"
import type { RangeNode } from "./constraints/range.js"
import type { RegexNode } from "./constraints/regex.js"
import { Disjoint } from "./disjoint.js"
import type { PredicateNode } from "./predicate.js"
import type { TypeNode } from "./type.js"

export type NodeSubclass<kind extends NodeKind> = {
    readonly kind: kind
    new (...args: any[]): NodeInstance<kind>
    compile(...args: any[]): string
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
    divisor: typeof DivisorNode
    range: typeof RangeNode
    regex: typeof RegexNode
    props: typeof PropsNode
    narrow: typeof NarrowNode
    morph: typeof MorphNode
}

type NodeKind = keyof NodeKinds

export abstract class Node<
    kind extends NodeKind = NodeKind,
    input = any,
    narrowed extends input = input
> {
    declare kind: kind
    declare condition: string
    declare allows: (data: input) => data is narrowed

    static #cache: { [kind in NodeKind]: Record<string, Node<kind>> } = {
        type: {},
        predicate: {},
        basis: {},
        divisor: {},
        range: {},
        regex: {},
        props: {},
        narrow: {},
        morph: {}
    }

    // TODO: accept compiled output as input
    constructor(
        protected subclass: NodeSubclass<kind>,
        ...input: Parameters<NodeKinds[kind]["compile"]>
    ) {
        const kind = subclass.kind
        const condition = subclass.compile(...input)
        if (Node.#cache[kind][condition]) {
            return Node.#cache[kind][condition] as any
        }
        this.condition = condition
        this.kind = kind as kind
        this.allows = new CompiledFunction<(data: input) => data is narrowed>(
            In,
            `return ${condition}`
        )
        ;(Node.#cache[kind] as any)[condition] = this
    }

    hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
        return this.kind === (kind as any)
    }

    #intersections: Record<string, NodeInstance<kind> | Disjoint> = {}
    intersect(other: NodeInstance<kind>): NodeInstance<kind> | Disjoint {
        if (this.condition === other.condition) {
            return this as NodeInstance<kind>
        }
        if (this.#intersections[other.condition]) {
            return this.#intersections[other.condition]
        }
        const result = this.subclass.intersect(
            this as NodeInstance<kind>,
            other
        )
        this.#intersections[other.condition] = result
        other.#intersections[this.condition] =
            result instanceof Disjoint ? result.invert() : (result as any)
        return result
    }

    abstract compileTraverse(s: CompilationState): string
    abstract toString(): string
}
