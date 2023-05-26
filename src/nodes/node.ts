import { CompiledFunction } from "../utils/compiledFunction.js"
import type { ClassNode } from "./basis/class.js"
import type { DomainNode } from "./basis/domain.js"
import type { ValueNode } from "./basis/value.js"
import type { DivisorNode } from "./constraints/divisor.js"
import type { MorphNode } from "./constraints/morph.js"
import type { NarrowNode } from "./constraints/narrow.js"
import type { EntryNode } from "./constraints/props/entry.js"
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
    entry: typeof EntryNode
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

const instanceCache: {
    [kind in NodeKind]: {
        [condition: string]: BaseNode<any>
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
    props: {},
    entry: {}
}

export abstract class BaseNode<subclass extends SubclassNode> {
    kind!: subclass["kind"]
    allows!: (data: unknown) => boolean
    condition!: string
    subconditions!: string[]
    subclass!: subclass

    constructor(public rule: Parameters<subclass["compile"]>[0]) {
        const subclass = this.constructor as subclass
        const subconditions = subclass.compile(rule)
        const condition = subconditions.join(" && ")
        if (instanceCache[subclass.kind][condition]) {
            return instanceCache[subclass.kind][condition]
        }
        this.subclass = subclass
        this.kind = subclass.kind
        this.condition = condition
        this.subconditions = subconditions
        this.allows = new CompiledFunction(`return ${condition}`)
        Object.freeze(this)
    }

    abstract toString(): string

    abstract computeIntersection(
        other: NodeInstances[subclass["kind"]]
    ): NodeInstances[subclass["kind"]] | Disjoint

    intersectionCache: {
        [otherCondition: string]: NodeInstances[subclass["kind"]] | Disjoint
    } = {}

    intersect(
        other: NodeInstances[subclass["kind"]]
    ): NodeInstances[subclass["kind"]] | Disjoint {
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
