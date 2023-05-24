import { CompiledFunction } from "../utils/compiledFunction.js"
import type { BasisDefinition } from "./basis/basis.js"
import type { ClassNode } from "./basis/class.js"
import type { DomainNode } from "./basis/domain.js"
import type { ValueNode } from "./basis/value.js"
import type { DivisorNode } from "./constraints/divisor.js"
import type { MorphNode } from "./constraints/morph.js"
import type { NarrowNode } from "./constraints/narrow.js"
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

const instances: {
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
    basis: {}
}

export abstract class BaseNode<subclass extends SubclassNode> {
    kind!: subclass["kind"]
    allows!: (data: unknown) => boolean
    condition!: string
    subconditions!: string[]
    declare prototype: subclass

    constructor(public rule: Parameters<subclass["compile"]>[0]) {
        const subconditions = this.prototype.compile(rule)
        const condition = subconditions.join(" && ")
        if (instances[this.prototype.kind][condition]) {
            return instances[this.prototype.kind][condition].instance
        }
        this.condition = condition
        this.subconditions = subconditions
        this.allows = new CompiledFunction(`return ${condition}`)
        this.kind = this.prototype.kind
        Object.freeze(this)
    }

    abstract computeIntersection(
        other: NodeInstances[subclass["kind"]]
    ): NodeInstances[subclass["kind"]] | Disjoint

    private intersections: {
        [otherCondition: string]: NodeInstances[subclass["kind"]] | Disjoint
    } = {}

    intersect(
        other: NodeInstances[subclass["kind"]]
    ): InstanceType<subclass> | Disjoint {
        if (this === other) {
            return this as never
        }
        if (
            instances[this.kind][this.condition].intersections[other.condition]
        ) {
            return instances[this.kind][this.condition][
                other.condition
            ] as never
        }
        const result = this.computeIntersection(other)
        if (result instanceof Disjoint) {
            instances[this.kind][this.condition][other.condition] = result
            instances[this.kind][other.condition][this.condition] =
                result.invert()
            return result
        }
        instances[this.kind][this.condition][other.condition] = result
        instances[this.kind][other.condition][this.condition] = result
        return result
    }
}

// export const defineNode = <rule, instance extends BaseNode<rule>>(
//     node: (new (
//         ...args: ConstructorParameters<typeof BaseNode<rule>>
//     ) => instance) & {
//         compile(rule: rule): string[]
//     }
// ) => {
//     const instances: {
//         [condition: string]: instance
//     } = {}

//     const create = (rule: rule): instance => {
//         const subconditions = node.compile(rule)
//         const condition = subconditions.join(" && ") ?? "true"
//         if (instances[condition]) {
//             return instances[condition]
//         }
//         const instance = new node(rule, condition, subconditions, create)
//         instances[condition] = instance
//         return instance
//     }
//     return create
// }
