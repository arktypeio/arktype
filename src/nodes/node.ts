import type { evaluate, extend, merge } from "../../dev/utils/src/main.js"
import { CompiledFunction } from "../../dev/utils/src/main.js"
import { arkKind } from "../compile/registry.js"
import { CompilationState, InputParameterName } from "../compile/state.js"
import type { TypeNode } from "../main.js"
import type { inferred } from "../parse/definition.js"
import type { NodeEntry } from "./composite/props.js"
import { Disjoint } from "./disjoint.js"
import type { NodeKind, NodeKinds } from "./kinds.js"
import type { BasisKind } from "./primitive/basis/basis.js"

type NodeConfig = {
    intersectsWith?: unknown
    keyed?: boolean
}

type DefaultNodeConfig = extend<
    Required<NodeConfig>,
    {
        intersectsWith: never
        keyed: false
    }
>

type BaseNodeImplementation<node extends BaseNode, parsableFrom> = {
    kind: node["kind"]
    /** Should convert any supported input formats to rule,
     *  then ensure rule is normalized such that equivalent
     *  inputs will compile to the same string. */
    parse: (rule: node["rule"] | parsableFrom) => node["rule"]
    compile: (rule: node["rule"], s: CompilationState) => string
    intersect: (
        l: Parameters<node["intersect"]>[0],
        r: Parameters<node["intersect"]>[0]
    ) => ReturnType<node["intersect"]>
}

export type NodeChildren = readonly BaseNode[] | readonly NodeEntry[]

type NodeExtension<node extends BaseNode> = (
    base: basePropsOf<node>
) => extendedPropsOf<node>

type basePropsOf<node extends BaseNode> = Pick<node, BuiltinBaseKey>

type extendedPropsOf<node extends BaseNode> = Omit<
    node,
    // we don't actually need the inferred symbol at runtime
    BuiltinBaseKey | typeof inferred
> &
    ThisType<node>

interface PreconstructedBase<rule, config extends NodeConfig> {
    readonly [arkKind]: "node"
    readonly kind: NodeKind
    readonly rule: rule
    readonly condition: string
    compile(state: CompilationState): string
    intersect(
        other: config["intersectsWith"] | this
    ): config["intersectsWith"] | this | Disjoint
    // TODO: can this work as is with late resolution?
    allows(data: unknown): boolean
    hasKind<kind extends NodeKind>(kind: kind): this is NodeKinds[kind]
    isBasis(): this is NodeKinds[BasisKind]
}

type BuiltinBaseKey = evaluate<keyof PreconstructedBase<any, any>>

type NodeExtensionProps<config extends NodeConfig = NodeConfig> = {
    description: string
} & (config["keyed"] extends true
    ? {
          keyof(): TypeNode
      }
    : {})

export type BaseNode<
    rule = unknown,
    config extends NodeConfig = {}
> = PreconstructedBase<rule, merge<DefaultNodeConfig, config>> &
    NodeExtensionProps<merge<DefaultNodeConfig, config>>

export type NodeConstructor<node extends BaseNode, input> = (
    input: node["rule"] | input
) => node

export const alphabetizeByCondition = <nodes extends BaseNode[]>(
    nodes: nodes
) => nodes.sort((l, r) => (l.condition > r.condition ? 1 : -1))

const intersectionCache: Record<string, BaseNode | Disjoint> = {}

export const defineNodeKind = <
    node extends BaseNode<any, any>,
    parsableFrom = never
>(
    def: BaseNodeImplementation<node, parsableFrom>,
    addProps: NodeExtension<node>
): NodeConstructor<node, parsableFrom> => {
    const nodeCache: {
        [condition: string]: node | undefined
    } = {}
    const isBasis =
        def.kind === "domain" || def.kind === "class" || def.kind === "value"
    const intersectionKind = isBasis ? "basis" : def.kind
    return (input) => {
        const rule = def.parse(input)
        const condition = def.compile(rule, new CompilationState("allows"))
        if (nodeCache[condition]) {
            return nodeCache[condition]!
        }
        const base: PreconstructedBase<node["rule"], never> = {
            [arkKind]: "node",
            kind: def.kind,
            hasKind: (kind) => kind === def.kind,
            isBasis: () => isBasis,
            condition,
            rule,
            compile: (state: CompilationState) => def.compile(rule, state),
            allows: new CompiledFunction(
                InputParameterName,
                `${condition}
            return true`
            ),
            intersect: (other) => {
                if (instance === other) {
                    return instance
                }
                const cacheKey = `${intersectionKind}${condition}${other.condition}`
                if (intersectionCache[cacheKey]) {
                    return intersectionCache[cacheKey]
                }
                const result: BaseNode | Disjoint = def.intersect(
                    instance,
                    other
                )
                intersectionCache[cacheKey] = result
                intersectionCache[
                    `${intersectionKind}${other.condition}${condition}`
                ] =
                    // also cache the result with other's condition as the key.
                    // if it was a Disjoint, it has to be inverted so that l,r
                    // still line up correctly
                    result instanceof Disjoint ? result.invert() : result
                return result
            }
        }
        const instance = Object.assign(addProps(base as node), base, {
            toString: () => instance.description
        }) as node
        nodeCache[condition] = instance
        return instance
    }
}
