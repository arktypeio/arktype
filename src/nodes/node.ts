import { throwInternalError } from "../utils/errors.js"
import { CompiledFunction } from "../utils/functions.js"
import type { ClassNode } from "./basis/class.js"
import type { DomainNode } from "./basis/domain.js"
import type { ValueNode } from "./basis/value.js"
import { In } from "./compilation.js"
import type { DivisorNode } from "./constraints/divisor.js"
import type { MorphNode } from "./constraints/morph.js"
import type { NarrowNode } from "./constraints/narrow.js"
import type { PropsNode } from "./constraints/props/props.js"
import type { RangeNode } from "./constraints/range.js"
import type { RegexNode } from "./constraints/regex.js"
import { Disjoint } from "./disjoint.js"
import type { PredicateNode } from "./predicate.js"
import type { TypeNode } from "./type.js"

export type NodeKinds = {
    type: typeof TypeNode
    predicate: typeof PredicateNode
    regex: typeof RegexNode
    range: typeof RangeNode
    narrow: typeof NarrowNode
    morph: typeof MorphNode
    divisor: typeof DivisorNode
    basis: typeof DomainNode | typeof ValueNode | typeof ClassNode
    props: typeof PropsNode
}

export type NodeInstances = {
    [kind in NodeKind]: InstanceType<NodeKinds[kind]>
}

export type NodeKind = keyof NodeKinds

export type SubclassNode = {
    readonly kind: NodeKind
    new (rule: never): BaseNode<any>
    compile(rule: never): string[]
}

export abstract class BaseNode<kind extends NodeKind = NodeKind> {
    abstract rule: unknown

    allows!: (data: unknown) => boolean

    static nodes: {
        [kind in NodeKind]: {
            [condition: string]: NodeInstances[kind]
        }
    } = {
        type: {},
        predicate: {},
        regex: {},
        range: {},
        narrow: {},
        morph: {},
        divisor: {},
        basis: {},
        props: {}
    }

    constructor(public kind: kind, public condition: string) {
        if (BaseNode.nodes[kind][condition]) {
            return throwInternalError(
                `Unexpected attempt to duplicate a cached ${this.constructor.name}.` +
                    `Ensure ${this.constructor.name}'s constructor returns a cached instance if one is available.`
            )
        }
        this.allows = new CompiledFunction(`${In}`, `return ${condition}`)
        BaseNode.nodes[kind as never][condition] = this as never
    }

    abstract toString(): string

    abstract computeIntersection(
        other: NodeInstances[kind]
    ): NodeInstances[kind] | Disjoint

    intersectionCache: {
        [otherCondition: string]: NodeInstances[kind] | Disjoint
    } = {}

    intersect(other: NodeInstances[kind]): NodeInstances[kind] | Disjoint {
        if (this === other) {
            return this as never
        }
        if (this.intersectionCache[other.condition]) {
            return this.intersectionCache[other.condition]
        }
        const result = this.computeIntersection(other)
        this.intersectionCache[other.condition] = result
        other.intersectionCache[this.condition] =
            result instanceof Disjoint ? result.invert() : result
        return result
    }
}
