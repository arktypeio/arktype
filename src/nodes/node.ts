import { In } from "../compile/compile.js"
import type { inferred } from "../parse/definition.js"
import { CompiledFunction } from "../utils/functions.js"
import { Disjoint } from "./disjoint.js"
import type { NodeKind, NodeKinds } from "./kinds.js"

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
    def: BaseNodeImplementation<node>,
    addProps: NodeExtension<node>
) => {
    const nodeCache: {
        [condition: string]: node | undefined
    } = {}
    return (rule: node["rule"]) => {
        const condition = def.compile(rule)
        if (nodeCache[condition]) {
            return nodeCache[condition]!
        }
        const intersectionCache: IntersectionCache<Node> = {}
        const base: NodeBase<NodeDefinition> & ThisType<node> = {
            [arkKind]: "node",
            kind: def.kind,
            hasKind: (kind) => kind === def.kind,
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
                const result = def.intersect(this as never, other as never)
                intersectionCache[other.condition] = result
                other.intersectionCache[condition] =
                    result instanceof Disjoint ? result.invert() : result
                return result
            }
        }
        const instance = Object.assign(base, addProps(base), {
            toString(this: node) {
                return this.description
            }
        }) as node
        nodeCache[condition] = instance
        return instance
    }
}
