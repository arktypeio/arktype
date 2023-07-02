import type { evaluate, extend, merge } from "../../dev/utils/src/main.js"
import { CompiledFunction, hasKey } from "../../dev/utils/src/main.js"
import type { CompilationContext } from "../compile/compile.js"
import {
    createCompilationContext,
    InputParameterName
} from "../compile/compile.js"
import { arkKind } from "../compile/registry.js"
import type { TypeNode } from "../main.js"
import type { inferred } from "../parse/definition.js"
import { Disjoint } from "./disjoint.js"
import type { CompositeNodeKind, NodeKind, NodeKinds } from "./kinds.js"
import type { BasisKind } from "./primitive/basis/basis.js"

type NodeConfig = {
    kind: NodeKind
    rule: unknown
    intersectsWith?: unknown
}

type DefaultNodeConfig = extend<
    Required<NodeConfig>,
    {
        kind: NodeKind
        rule: unknown
        intersectsWith: never
    }
>

type BaseNodeImplementation<node extends BaseNode, parsableFrom> = {
    kind: node["kind"]
    /** Should convert any supported input formats to rule,
     *  then ensure rule is normalized such that equivalent
     *  inputs will compile to the same string. */
    parse: (rule: node["rule"] | parsableFrom) => node["rule"]
    compile: (rule: node["rule"], ctx: CompilationContext) => string
    intersect: (
        l: Parameters<node["intersect"]>[0],
        r: Parameters<node["intersect"]>[0]
    ) => ReturnType<node["intersect"]>
} & (node["kind"] extends CompositeNodeKind
    ? {
          getReferences: (rule: node["rule"]) => TypeNode[]
      }
    : {})

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

interface PreconstructedBase<config extends NodeConfig> {
    readonly [arkKind]: "node"
    readonly kind: config["kind"]
    readonly rule: config["rule"]
    readonly source: string
    readonly condition: string
    readonly references: TypeNode[]
    alias: string
    compile(ctx: CompilationContext): string
    intersect(
        other: config["intersectsWith"] | this
    ): config["intersectsWith"] | this | Disjoint
    // TODO: can this work as is with late resolution?
    allows(data: unknown): boolean
    hasKind<kind extends NodeKind>(kind: kind): this is NodeKinds[kind]
    isBasis(): this is NodeKinds[BasisKind]
}

type BuiltinBaseKey = evaluate<keyof PreconstructedBase<any>>

type NodeExtensionProps = {
    description: string
}

export type BaseNode<config extends NodeConfig = DefaultNodeConfig> =
    PreconstructedBase<merge<DefaultNodeConfig, config>> & NodeExtensionProps

export type NodeConstructor<node extends BaseNode, input> = (
    input: node["rule"] | input
) => node

export const alphabetizeByCondition = <nodes extends BaseNode[]>(
    nodes: nodes
) => nodes.sort((l, r) => (l.condition > r.condition ? 1 : -1))

const intersectionCache: Record<string, BaseNode | Disjoint> = {}

export const defineNodeKind = <
    node extends BaseNode<any>,
    parsableFrom = never
>(
    def: BaseNodeImplementation<node, parsableFrom>,
    addProps: NodeExtension<node>
): NodeConstructor<node, parsableFrom> => {
    const nodeCache: {
        [condition: string]: node | undefined
    } = {}
    let anonymousSuffix = 1
    const isBasis =
        def.kind === "domain" || def.kind === "class" || def.kind === "value"
    const intersectionKind = isBasis ? "basis" : def.kind
    return (input) => {
        const rule = def.parse(input)
        const source = def.compile(
            rule,
            createCompilationContext("out", "problems")
        )
        if (nodeCache[source]) {
            return nodeCache[source]!
        }
        const condition = def.compile(
            rule,
            createCompilationContext("true", "false")
        )
        const base: PreconstructedBase<DefaultNodeConfig> = {
            [arkKind]: "node",
            kind: def.kind,
            alias: `${def.kind}${anonymousSuffix++}`,
            hasKind: (kind) => kind === def.kind,
            isBasis: () => isBasis,
            source,
            condition,
            references: hasKey(def, "getReferences")
                ? [...new Set(def.getReferences(rule))]
                : [],
            rule,
            compile: (ctx: CompilationContext) => def.compile(rule, ctx),
            allows: new CompiledFunction(
                InputParameterName,
                `${condition}
            return true`
            ),
            intersect: (other) => {
                if (instance === other) {
                    return instance
                }
                const cacheKey = `${intersectionKind}${source}${other.source}`
                if (intersectionCache[cacheKey]) {
                    return intersectionCache[cacheKey]
                }
                const result: BaseNode | Disjoint = def.intersect(
                    instance,
                    other
                )
                intersectionCache[cacheKey] = result
                intersectionCache[
                    `${intersectionKind}${other.source}${source}`
                ] =
                    // also cache the result with other's source as the key.
                    // if it was a Disjoint, it has to be inverted so that l, r
                    // still line up correctly
                    result instanceof Disjoint ? result.invert() : result
                return result
            }
        }
        const instance = Object.assign(addProps(base as node), base, {
            toString: () => instance.description
        }) as node
        nodeCache[source] = instance
        return instance
    }
}
