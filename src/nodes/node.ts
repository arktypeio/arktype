import {
    In,
    joinIntersectionConditions,
    joinUnionConditions
} from "../compile/compile.js"
import type { inferred } from "../parse/definition.js"
import { CompiledFunction } from "../utils/functions.js"
import type { evaluate } from "../utils/generics.js"
import type { NodeEntry } from "./composite/props.js"
import { Disjoint } from "./disjoint.js"
import type { NodeKind, NodeKinds } from "./kinds.js"

export type ConditionTree = string | ConditionTree[]

type BaseNodeImplementation<node extends BaseNode, parsableFrom> = {
    kind: node["kind"]
    /** Should convert any supported input formats to rule,
     *  then ensure rule is normalized such that equivalent
     *  inputs will compile to the same string. */
    parse: (rule: node["rule"] | parsableFrom) => node["rule"]
    compile: (rule: node["rule"]) => string[]
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
    subconditions: string[]
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
    rule: node["rule"] | input,
    thisType?: Record<PropertyKey, never>
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
        const subconditions = def.compile(rule)
        const condition =
            def.kind === "type"
                ? joinUnionConditions(subconditions)
                : joinIntersectionConditions(subconditions)
        if (nodeCache[condition]) {
            return nodeCache[condition]!
        }
        const intersectionCache: IntersectionCache<BaseNode> = {}
        const base: PreconstructedBase<node["rule"], never> & ThisType<node> = {
            [arkKind]: "node",
            kind: def.kind,
            hasKind: (kind) => kind === def.kind,
            subconditions,
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
