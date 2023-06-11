import type { CompilationNode } from "../compile/compile.js"
import { compile, In } from "../compile/compile.js"
import type { inferred } from "../parse/definition.js"
import { CompiledFunction } from "../utils/functions.js"
import { Disjoint } from "./disjoint.js"
import type { NodeKind, NodeKinds } from "./kinds.js"

export type BaseNodeImplementation<node extends Node, parsableFrom> = {
    kind: node["kind"]
    parse: (rule: node["rule"] | parsableFrom) => node["rule"]
    compile: (rule: node["rule"]) => any //CompilationNode
    intersect: (
        l: Parameters<node["intersect"]>[0],
        r: Parameters<node["intersect"]>[0]
    ) => ReturnType<node["intersect"]>
}

type NodeExtension<node extends Node> = (
    base: basePropsOf<node>
) => extendedPropsOf<node>

export type basePropsOf<node extends Node> = Pick<
    node,
    keyof NodeBase<any, any>
>

export type extendedPropsOf<node extends Node> = Omit<
    node,
    keyof NodeBase<any, any> | typeof inferred
> &
    ThisType<node>

export interface NodeBase<rule, intersectsWith> {
    [arkKind]: "node"
    kind: NodeKind
    rule: rule
    compilation: CompilationNode
    condition: string
    intersect(other: intersectsWith | this): intersectsWith | this | Disjoint
    intersectionCache: Record<
        string,
        this | intersectsWith | Disjoint | undefined
    >
    allows(data: unknown): boolean
    hasKind<kind extends NodeKind>(kind: kind): this is NodeKinds[kind]
}

export type BaseNodeExtensionProps = {
    description: string
}

export type Node<rule = unknown, intersectsWith = never> = NodeBase<
    rule,
    intersectsWith
> &
    BaseNodeExtensionProps

type IntersectionCache<node> = Record<string, node | Disjoint | undefined>

export const isNode = (value: unknown): value is Node =>
    (value as any)?.[arkKind] === "node"

export const arkKind = Symbol("ArkTypeInternalKind")

export type NodeConstructor<node extends Node, input> = (
    rule: node["rule"] | input
) => node

export const defineNodeKind = <
    node extends Node<any, any>,
    parsableFrom = never
>(
    def: BaseNodeImplementation<node, parsableFrom>,
    addProps: NodeExtension<node>
): NodeConstructor<node, parsableFrom> => {
    const nodeCache: {
        [condition: string]: node | undefined
    } = {}
    return (input) => {
        const rule = def.parse(input)
        const compilation = def.compile(rule)
        const condition =
            typeof compilation === "string" ? compilation : compile(compilation)
        if (nodeCache[condition]) {
            return nodeCache[condition]!
        }
        const intersectionCache: IntersectionCache<Node> = {}
        const base: NodeBase<node["rule"], never> & ThisType<node> = {
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
                const result: Node | Disjoint = def.intersect(this, other)
                intersectionCache[other.condition] = result
                other.intersectionCache[condition] =
                    result instanceof Disjoint ? result.invert() : result
                return result
            }
        }
        const instance = Object.assign(base, addProps(base as node), {
            toString(this: node) {
                return this.description
            }
        }) as node
        nodeCache[condition] = instance
        return instance
    }
}
