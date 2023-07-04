import type { Dict, evaluate } from "../../dev/utils/src/main.js"
import { CompiledFunction } from "../../dev/utils/src/main.js"
import type { CompilationContext } from "../compile/compile.js"
import {
    createCompilationContext,
    InputParameterName
} from "../compile/compile.js"
import { arkKind } from "../compile/registry.js"
import type { inferred } from "../parse/definition.js"
import type { ParseContext } from "../scope.js"
import { Disjoint } from "./disjoint.js"
import type { NodeKind, NodeKinds } from "./kinds.js"
import type { BasisKind } from "./primitive/basis/basis.js"

export interface BaseNodeConfig {
    kind: NodeKind
    rule: unknown
    meta: Dict
}

export interface BaseNodeImplementation<node extends BaseNode> {
    kind: node["kind"]
    compile: (rule: node["rule"], ctx: CompilationContext) => string
}

export type NodeExtensions<node extends BaseNode> = (
    base: basePropsOf<node>
) => extendedPropsOf<node>

type basePropsOf<node extends BaseNode> = Pick<node, BuiltinBaseKey>

type extendedPropsOf<node extends BaseNode> = Omit<
    node,
    // we don't actually need the inferred symbol at runtime
    BuiltinBaseKey | typeof inferred
> &
    ThisType<node>

interface PreconstructedBase<config extends BaseNodeConfig> {
    readonly [arkKind]: "node"
    readonly kind: config["kind"]
    readonly input: "input" extends keyof config
        ? config["input"]
        : config["rule"]
    readonly rule: config["rule"]
    readonly source: string
    readonly condition: string
    alias: string
    compile(ctx: CompilationContext): string
    // TODO: can this work as is with late resolution?
    allows(data: unknown): boolean
    hasKind<kind extends NodeKind>(kind: kind): this is NodeKinds[kind]
    isBasis(): this is NodeKinds[BasisKind]
}

type BuiltinBaseKey = evaluate<keyof PreconstructedBase<BaseNodeConfig>>

type NodeExtensionProps = {
    description: string
}

export type BaseNode<config extends BaseNodeConfig = BaseNodeConfig> =
    PreconstructedBase<config> & NodeExtensionProps

export type NodeConstructor<node extends BaseNode> = (
    input: node["input"],
    ctx: ParseContext
) => node

export const alphabetizeByCondition = <nodes extends BaseNode[]>(
    nodes: nodes
) => nodes.sort((l, r) => (l.condition > r.condition ? 1 : -1))

const intersectionCache: Record<string, BaseNode | Disjoint> = {}

export const defineNode = <node extends BaseNode<any>>(
    def: BaseNodeImplementation<node>,
    extensions: NodeExtensions<node>
): NodeConstructor<node> => {
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
        const base: PreconstructedBase<BaseNodeConfig> = {
            [arkKind]: "node",
            kind: def.kind,
            input,
            alias: `${def.kind}${anonymousSuffix++}`,
            hasKind: (kind) => kind === def.kind,
            isBasis: () => isBasis,
            source,
            condition,
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
        const instance = Object.assign(extensions(base as node), base, {
            toString: () => instance.description
        }) as node
        nodeCache[source] = instance
        return instance
    }
}
