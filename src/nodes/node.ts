import type { CompilationNode } from "../compile/compile.js"
import { compile, In } from "../compile/compile.js"
import type { inferred } from "../parse/definition.js"
import { CompiledFunction } from "../utils/functions.js"
import { Disjoint } from "./disjoint.js"
import type { NodeKind, NodeKinds } from "./kinds.js"

export type BaseNodeImplementation<node extends Node, input> = {
    kind: node["kind"]
    parse: (rule: node["rule"] | input) => node["rule"]
    compile: (rule: node["rule"]) => CompilationNode
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

export interface NodeBase<def extends NodeDefinition> {
    [arkKind]: "node"
    kind: def["kind"]
    rule: def["rule"]
    compilation: CompilationNode
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

export type NodeConstructor<node extends Node, input> = (
    rule: node["rule"] | input
) => node

export const defineNodeKind = <node extends Node, input = never>(
    def: BaseNodeImplementation<node, input>,
    addProps: NodeExtension<node>
): NodeConstructor<node, input> => {
    const nodeCache: {
        [condition: string]: node | undefined
    } = {}
    return (rule) => {
        const compilation = def.compile(rule)
        const condition =
            typeof compilation === "string" ? compilation : compile(compilation)
        if (nodeCache[condition]) {
            return nodeCache[condition]!
        }
        const intersectionCache: IntersectionCache<Node> = {}
        const base: NodeBase<NodeDefinition> & ThisType<node> = {
            [arkKind]: "node",
            kind: def.kind,
            hasKind: (kind) => kind === def.kind,
            compilation,
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
