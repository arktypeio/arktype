import { CompiledFunction } from "../utils/compiledFunction.js"
import type { conform } from "../utils/generics.js"
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

type NodeSubclass<
    kind extends NodeKind,
    children extends readonly unknown[]
> = {
    kind: kind
    new (...children: children): Node<any, any>
    compile(children: children): string
}

// export type NodeKinds = {
//     TypeNode: typeof TypeNode
//     PredicateNode: typeof PredicateNode
//     BasisNode: typeof BasisNode
//     DivisorNode: typeof DivisorNode
//     RangeNode: typeof RangeNode
//     RegexNode: typeof RegexNode
//     PropsNode: typeof PropsNode
//     NarrowNode: typeof NarrowNode
//     MorphNode: typeof MorphNode
// }

export type NodeKind = keyof NodeKinds

export type Nodes = { [k in NodeKind]: InstanceType<NodeKinds[k]> }

// compileId(children: children) {
//     return children
//         .map((child) =>
//             typeof child === "string" ? child : child.condition
//         )
//         .sort()
//         .join()
// }

//subclass extends NodeSubclass<children> = NodeSubclass<any>,
export abstract class Node<
    kind extends NodeKind = NodeKind,
    children extends readonly unknown[] = readonly unknown[],
    narrowed = unknown
> {
    declare allows: (data: unknown) => data is narrowed
    // declare subclass: NodeKinds[kind]
    declare kind: kind
    declare condition: string
    declare children: children

    abstract subclass: NodeSubclass<kind, children>
    abstract intersectNode(other: Nodes[kind]): Nodes[kind] | Disjoint
    abstract compileTraverse(s: CompilationState): string
    abstract toString(): string

    constructor(...children: children) {
        const subclass = this.constructor.prototype as NodeKinds[kind]
        const kind = subclass.kind as kind
        const condition = subclass
        if (Node.cache[kind][condition]) {
            return Node.cache[kind][condition] as any
        }
        this.kind = kind
        this.condition = condition
        this.children = children
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

    hasKind<kind extends NodeKind>(kind: kind): this is Nodes[kind] {
        return this.kind === (kind as any)
    }

    private intersectionCache: Record<string, Nodes[kind] | Disjoint> = {}
    intersect(other: Nodes[kind]): Nodes[kind] | Disjoint {
        if (this === other) {
            return this as Nodes[kind]
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
