import { In } from "../compile/compile.js"
import type { inferred } from "../parse/definition.js"
import { CompiledFunction } from "../utils/functions.js"
import type { ClassNode } from "./basis/class.js"
import type { DomainNode } from "./basis/domain.js"
import type { ValueNode } from "./basis/value.js"
import type { DivisorNode } from "./constraints/divisor.js"
import type { MorphNode } from "./constraints/morph.js"
import type { NarrowNode } from "./constraints/narrow.js"
import type { PropsNode } from "./constraints/props/props.js"
import type { RangeNode } from "./constraints/range.js"
import type { RegexNode } from "./constraints/regex.js"
import { Disjoint } from "./disjoint.js"
import type { PredicateNode } from "./predicate.js"
import type { TypeNode } from "./type.js"

export const precedenceByKind = {
    // roots
    type: 0,
    predicate: 1,
    // basis checks
    domain: 2,
    class: 2,
    value: 2,
    // shallow checks
    range: 3,
    divisor: 3,
    regex: 3,
    // deep checks
    props: 4,
    // narrows
    narrow: 5,
    // morphs
    morph: 6
} as const satisfies Record<NodeKind, number>

export type NodeKinds = {
    type: TypeNode
    predicate: PredicateNode
    domain: DomainNode
    class: ClassNode
    value: ValueNode
    range: RangeNode
    divisor: DivisorNode
    regex: RegexNode
    props: PropsNode
    narrow: NarrowNode
    morph: MorphNode
}

export type NodeKind = keyof NodeKinds

type BaseNodeImplementation<node extends Node> = {
    kind: node["kind"]
    compile: (rule: node["rule"]) => string
    intersect: (
        l: Parameters<node["intersect"]>[0],
        r: Parameters<node["intersect"]>[0]
    ) => ReturnType<node["intersect"]>
}

type NodeExtension<node extends Node> = (
    base: basePropsOf<node>
) => extendedPropsOf<node>

export type basePropsOf<node extends Node> = Pick<node, keyof NodeBase<any>>

export type extendedPropsOf<node extends Node> = Omit<
    node,
    keyof NodeBase<any> | typeof inferred
> &
    ThisType<node>

export type NodeDefinition = {
    kind: NodeKind
    rule: unknown
    intersected: Node<any>
}

// Need an interface to use `this`
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface NodeBase<def extends NodeDefinition> {
    [arkKind]: "node"
    kind: def["kind"]
    rule: def["rule"]
    condition: string
    intersect(other: def["intersected"]): def["intersected"] | Disjoint
    intersectionCache: Record<string, def["intersected"] | Disjoint | undefined>
    allows(data: unknown): boolean
    hasKind<kind extends NodeKind>(kind: kind): this is NodeKinds[kind]
}

export type BaseNodeExtensionProps = {
    description: string
}

export type Node<def extends NodeDefinition = NodeDefinition> = NodeBase<def> &
    BaseNodeExtensionProps

type IntersectionCache<node> = Record<string, node | Disjoint | undefined>

export const isNode = (value: unknown): value is Node =>
    (value as any)?.[arkKind] === "node"

export const arkKind = Symbol("ArkTypeInternalKind")

export const defineNodeKind = <node extends Node>(
    base: BaseNodeImplementation<node>,
    addProps: NodeExtension<node>
) => {
    const nodeCache: {
        [condition: string]: node | undefined
    } = {}
    const construct = (rule: node["rule"]) => {
        const condition = base.compile(rule)
        if (nodeCache[condition]) {
            return nodeCache[condition]!
        }
        const intersectionCache: IntersectionCache<Node> = {}
        const instance: NodeBase<NodeDefinition> & ThisType<node> = {
            [arkKind]: "node",
            kind: base.kind,
            hasKind: (kind) => kind === base.kind,
            condition,
            rule,
            allows: new CompiledFunction(`${In}`, `return ${condition}`),
            intersectionCache,
            intersect(other) {
                if (this === other) {
                    return this
                }
                if (intersectionCache[other.condition]) {
                    return intersectionCache[other.condition]!
                }
                const result = base.intersect(this as never, other as never)
                intersectionCache[other.condition] = result
                other.intersectionCache[condition] =
                    result instanceof Disjoint ? result.invert() : result
                return result
            }
        }
        const props = addProps(instance)
        return Object.assign(instance, props, {
            toString(this: node) {
                return this.description
            }
        }) as node
    }
    return construct
}
