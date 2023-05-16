import { CompiledFunction } from "../utils/compiledFunction.js"
import type { constructor, instanceOf } from "../utils/objectKinds.js"
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

// compileId(children: children) {
//     return children
//         .map((child) =>
//             typeof child === "string" ? child : child.condition
//         )
//         .sort()
//         .join()
// }

// export type Node2<kind extends NodeKind = NodeKind, narrowed = unknown> = {
//     allows: (data: unknown) => data is narrowed
//     intersectNode: (other: NodeInstance<kind>) => NodeInstance<kind> | Disjoint
//     compileTraverse: (s: CompilationState) => string
//     toString(): string
// }

export abstract class Node<
    kind extends NodeKind = NodeKind,
    narrowed = unknown
> {
    declare allows: (data: unknown) => data is narrowed

    abstract intersectNode(
        other: NodeInstance<kind>
    ): NodeInstance<kind> | Disjoint
    abstract compileTraverse(s: CompilationState): string
    abstract toString(): string
    abstract children: readonly unknown[]

    constructor(public kind: kind, public condition: string) {
        if (Node.cache[kind][condition]) {
            return Node.cache[kind][condition] as any
        }
        this.allows = new CompiledFunction(In, `return ${condition}`)
        ;(Node.cache[kind] as any)[condition] = this
    }

    private static cache: { [kind in NodeKind]: Record<string, Node<kind>> } = {
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

    hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
        return this.kind === (kind as any)
    }

    private intersectionCache: Record<string, NodeInstance<kind> | Disjoint> =
        {}
    intersect(other: NodeInstance<kind>): NodeInstance<kind> | Disjoint {
        if (this === other) {
            return this as NodeInstance<kind>
        }
        if (this.intersectionCache[other.condition]) {
            return this.intersectionCache[other.condition]
        }
        const result = this.intersectNode(other)
        this.intersectionCache[other.condition] = result
        other.intersectionCache[this.condition] =
            result instanceof Disjoint ? result.invert() : (result as any)
        return result
    }
}
