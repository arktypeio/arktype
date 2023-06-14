import { compilePathAccess, In } from "../compile/compile.js"
import type { inferred } from "../parse/definition.js"
import { CompiledFunction } from "../utils/functions.js"
import type { evaluate } from "../utils/generics.js"
import { isArray } from "../utils/objectKinds.js"
import type { NodeEntry } from "./composite/props.js"
import { Disjoint } from "./disjoint.js"
import type { NodeKind, NodeKinds } from "./kinds.js"

export type CompilationTree =
    | CompilationNode
    | (CompilationNode | CompilationTree)[]

export type CompilationNode = string | CompositeCompilationNode

export type CompositeCompilationNode = {
    children: CompilationTree
    prefix?: string
    key?: string
    suffix?: string
}

type CompilationContext = {
    path: string[]
}

export const compileCondition = (
    tree: CompilationTree,
    ctx: CompilationContext
): string =>
    isArray(tree)
        ? tree.flatMap((child) => compileCondition(child, ctx)).join("\n")
        : typeof tree === "string"
        ? `if(!(${tree.replaceAll(In, compilePathAccess(ctx.path))})) {
    return false
}`
        : `${tree.prefix ?? ""}${compileCondition(tree.children, {
              path: tree.key ? [...ctx.path, tree.key] : ctx.path
          })}${tree.suffix ?? ""}`

type BaseNodeImplementation<node extends BaseNode, parsableFrom> = {
    kind: node["kind"]
    /** Should convert any supported input formats to rule,
     *  then ensure rule is normalized such that equivalent
     *  inputs will compile to the same string. */
    parse: (rule: node["rule"] | parsableFrom) => node["rule"]
    compile: (rule: node["rule"]) => CompilationTree
    intersect: (
        l: Parameters<node["intersect"]>[0],
        r: Parameters<node["intersect"]>[0]
    ) => ReturnType<node["intersect"]>
}

export type NodeChildren = BaseNode[] | NodeEntry[]

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

interface PreconstructedBase<rule, intersectsWith> {
    [arkKind]: "node"
    kind: NodeKind
    rule: rule
    compilation: CompilationTree
    condition: string
    intersect(other: intersectsWith | this): intersectsWith | this | Disjoint
    intersectionCache: Record<
        string,
        this | intersectsWith | Disjoint | undefined
    >
    allows(data: unknown): boolean
    hasKind<kind extends NodeKind>(kind: kind): this is NodeKinds[kind]
}

type BuiltinBaseKey = evaluate<keyof PreconstructedBase<any, any>>

export type BaseNodeExtensionProps = {
    description: string
}

export type BaseNode<
    rule = unknown,
    intersectsWith = never
> = PreconstructedBase<rule, intersectsWith> & BaseNodeExtensionProps

type IntersectionCache<node> = Record<string, node | Disjoint | undefined>

export const isNode = (value: unknown): value is BaseNode =>
    (value as any)?.[arkKind] === "node"

export const arkKind = Symbol("ArkTypeInternalKind")

export type NodeConstructor<node extends BaseNode, input> = (
    rule: node["rule"] | input
) => node

export const alphabetizeByCondition = <nodes extends BaseNode[]>(
    nodes: nodes
) => nodes.sort((l, r) => (l.condition > r.condition ? 1 : -1))

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
    return (input) => {
        const rule = def.parse(input)
        const compilation = def.compile(rule)
        const condition = compileCondition(compilation, { path: [] })
        if (nodeCache[condition]) {
            return nodeCache[condition]!
        }
        const intersectionCache: IntersectionCache<BaseNode> = {}
        const base: PreconstructedBase<node["rule"], never> & ThisType<node> = {
            [arkKind]: "node",
            kind: def.kind,
            hasKind: (kind) => kind === def.kind,
            compilation,
            condition,
            rule,
            allows: new CompiledFunction(
                In,
                `${condition}
            return true`
            ),
            intersectionCache,
            intersect(other) {
                if (this === other) {
                    return this
                }
                if (intersectionCache[other.condition]) {
                    return intersectionCache[other.condition]!
                }
                const result: BaseNode | Disjoint = def.intersect(this, other)
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
