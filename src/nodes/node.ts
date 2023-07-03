import type { evaluate } from "../../dev/utils/src/main.js"
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
import type { Node, NodeKind, NodeKinds } from "./kinds.js"
import type { BaseBasisNode, BasisKind } from "./primitive/basis/basis.js"
import type { Constraint } from "./primitive/primitive.js"

export interface BaseNodeImplementation<node extends BaseNode> {
    kind: node["kind"]
    /** Should convert any supported input formats to rule,
     *  then ensure rule is normalized such that equivalent
     *  inputs will compile to the same string. */
    parse: (input: node["input"]) => node["children"]
    compile: (children: node["children"], ctx: CompilationContext) => string
    intersect: (
        l: Parameters<node["intersect"]>[0],
        r: Parameters<node["intersect"]>[0]
    ) => ReturnType<node["intersect"]>
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

export type NodeChild = Constraint | Node

export type NodeChildren = readonly NodeChild[]

interface PreconstructedBase<kind extends NodeKind, parsableInput> {
    readonly [arkKind]: "node"
    readonly kind: kind
    readonly input: this["children"] | parsableInput
    readonly children: NodeChildren
    readonly source: string
    readonly condition: string
    alias: string
    compile(ctx: CompilationContext): string
    intersect(other: intersectsWith<kind> | this): this["children"] | Disjoint
    // TODO: can this work as is with late resolution?
    allows(data: unknown): boolean
    hasKind<kind extends NodeKind>(kind: kind): this is NodeKinds[kind]
    isBasis(): this is NodeKinds[BasisKind]
}

type intersectsWith<kind extends NodeKind> = kind extends BasisKind
    ? BaseBasisNode
    : never

type BuiltinBaseKey = evaluate<keyof PreconstructedBase<any, any>>

type NodeExtensionProps = {
    description: string
}

export type BaseNode<
    kind extends NodeKind = NodeKind,
    parsableInput = unknown
> = PreconstructedBase<kind, parsableInput> & NodeExtensionProps

export type NodeConstructor<node extends BaseNode> = (
    input: node["input"],
    ctx: ParseContext
) => node

export const alphabetizeByCondition = <nodes extends BaseNode[]>(
    nodes: nodes
) => nodes.sort((l, r) => (l.condition > r.condition ? 1 : -1))

const intersectionCache: Record<string, BaseNode | Disjoint> = {}

export const defineNodeKind = <node extends BaseNode<any>>(
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
        const children = def.parse(input)
        const source = def.compile(
            children,
            createCompilationContext("out", "problems")
        )
        if (nodeCache[source]) {
            return nodeCache[source]!
        }
        const condition = def.compile(
            children,
            createCompilationContext("true", "false")
        )
        const base: PreconstructedBase<NodeKind, unknown> = {
            [arkKind]: "node",
            kind: def.kind,
            input,
            alias: `${def.kind}${anonymousSuffix++}`,
            hasKind: (kind) => kind === def.kind,
            isBasis: () => isBasis,
            source,
            condition,
            children,
            compile: (ctx: CompilationContext) => def.compile(children, ctx),
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
